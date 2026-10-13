# Multimodal Vision Extraction Specification: tablet.ai

This document defines the production Gemini Vision ingestion pipeline for Antigravity code generation. It includes the system prompt, strict structured JSON schema, server-side implementation using `@google/genai`, and post-processing validation heuristics.

---

## 1\. System Prompt

Feed this system prompt directly into the Gemini model configuration:

```
You are a specialized clinical transcription engine trained to parse pharmacy receipts, medical invoices, and discharge medication summaries.

Your objective is to extract medication schedules, dosages, and administration timing into a strict, validated schema.

RULES & CONSTRAINTS:
1. MEDICATIONS ONLY: Extract solely ingestible, injectable, or topical pharmaceuticals (tablets, capsules, syrups, suspensions, drops, ointments, inhalers).
2. EXCLUDE NON-DRUG INVENTORY: Completely ignore disposable medical supplies (syringes, needles, gloves, masks, gauze, cotton rolls), consultation fees, diagnostic tests, delivery surcharges, tax line items (GST/VAT), discounts, and miscellaneous pharmacy sundries.
3. INSTRUCTION EXTRACTION:
   - Identify dosage cadence: "1-0-1" -> TWICE_DAILY, "1-1-1" -> THRICE_DAILY, "0-0-1" or "HS" -> ONCE_DAILY (bedtime), "OD" -> ONCE_DAILY, "TDS"/"TID" -> THRICE_DAILY, "QID" -> FOUR_TIMES_DAILY, "SOS"/"PRN" -> AS_NEEDED.
   - Food relation: Look for cues like "AC" or "before meals" -> BEFORE_FOOD; "PC" or "after meals" -> AFTER_FOOD; "with meal" -> WITH_FOOD; "fasting" -> EMPTY_STOMACH. If unspecified, mark as NONE.
   - Recommended daily slots: Map frequency and food timings to standard slots: MORNING, AFTERNOON, EVENING, BEDTIME.
4. QUANTITY & DURATION:
   - Parse total dispense quantity as an integer.
   - Calculate inferred_duration_days: total_quantity / daily_dose_count. If the receipt does not state instructions clearly or calculation yields 0, default to 7.
5. CONFIDENCE SCORING:
   - Return a confidence_score between 0.00 and 1.00 based on receipt legibility, text sharpness, and whether crucial dosage instructions were explicitly printed vs. inferred.
   - If the uploaded image is blurry, corrupted, or not a pharmaceutical receipt/prescription, set is_pharmacy_receipt to false and return an empty items list.
6. ZERO PHI/PII RECORDING: Do NOT extract patient personal identity, billing addresses, credit card numbers, or insurance IDs.
```

&nbsp;

---

## 2\. Gemini Strict JSON Schema (`response_schema`)

Use this schema definition compliant with the Google Gen AI SDK OpenAPI subset:

```json
{
  "type": "OBJECT",
  "properties": {
    "confidence_score": {
      "type": "NUMBER",
      "description": "Calculated OCR and semantic parsing confidence between 0.00 and 1.00"
    },
    "is_pharmacy_receipt": {
      "type": "BOOLEAN",
      "description": "True if the image is a valid pharmacy receipt, invoice, or prescription sheet"
    },
    "items": {
      "type": "ARRAY",
      "description": "List of valid pharmaceutical drugs identified on the bill",
      "items": {
        "type": "OBJECT",
        "properties": {
          "medicine_name": {
            "type": "STRING",
            "description": "Generic or brand name of the medication, e.g., 'Amoxicillin' or 'Augmentin'"
          },
          "strength": {
            "type": "STRING",
            "description": "Strength concentration, e.g., '500mg', '10ml', '0.5%', '25mcg'. Return 'N/A' if omitted."
          },
          "dosage_quantity": {
            "type": "STRING",
            "description": "Unit per intake, e.g., '1 tablet', '2 capsules', '5 ml', '2 drops'"
          },
          "frequency_pattern": {
            "type": "STRING",
            "enum": [
              "ONCE_DAILY",
              "TWICE_DAILY",
              "THRICE_DAILY",
              "FOUR_TIMES_DAILY",
              "AS_NEEDED",
              "UNKNOWN"
            ]
          },
          "meal_timing": {
            "type": "STRING",
            "enum": [
              "BEFORE_FOOD",
              "AFTER_FOOD",
              "WITH_FOOD",
              "EMPTY_STOMACH",
              "NONE"
            ]
          },
          "suggested_slots": {
            "type": "ARRAY",
            "items": {
              "type": "STRING",
              "enum": [
                "MORNING",
                "AFTERNOON",
                "EVENING",
                "BEDTIME"
              ]
            }
          },
          "total_quantity": {
            "type": "INTEGER",
            "description": "Total count of pills/bottles purchased"
          },
          "inferred_duration_days": {
            "type": "INTEGER",
            "description": "Estimated duration in days to complete the prescribed units"
          }
        },
        "required": [
          "medicine_name",
          "strength",
          "dosage_quantity",
          "frequency_pattern",
          "meal_timing",
          "suggested_slots",
          "total_quantity",
          "inferred_duration_days"
        ]
      }
    }
  },
  "required": [
    "confidence_score",
    "is_pharmacy_receipt",
    "items"
  ]
}
```

&nbsp;

---

## 3\. Node.js Implementation Route (`@google/genai`)

Here is the backend service module for Antigravity to drop into `src/services/geminiExtraction.ts`:

```ts
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI();

export interface ExtractedMedication {
  medicine_name: string;
  strength: string;
  dosage_quantity: string;
  frequency_pattern: 'ONCE_DAILY' | 'TWICE_DAILY' | 'THRICE_DAILY' | 'FOUR_TIMES_DAILY' | 'AS_NEEDED' | 'UNKNOWN';
  meal_timing: 'BEFORE_FOOD' | 'AFTER_FOOD' | 'WITH_FOOD' | 'EMPTY_STOMACH' | 'NONE';
  suggested_slots: Array<'MORNING' | 'AFTERNOON' | 'EVENING' | 'BEDTIME'>;
  total_quantity: number;
  inferred_duration_days: number;
}

export interface ExtractionResponse {
  confidence_score: number;
  is_pharmacy_receipt: boolean;
  items: ExtractedMedication[];
}

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    confidence_score: { type: Type.NUMBER },
    is_pharmacy_receipt: { type: Type.BOOLEAN },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          medicine_name: { type: Type.STRING },
          strength: { type: Type.STRING },
          dosage_quantity: { type: Type.STRING },
          frequency_pattern: {
            type: Type.STRING,
            enum: ['ONCE_DAILY', 'TWICE_DAILY', 'THRICE_DAILY', 'FOUR_TIMES_DAILY', 'AS_NEEDED', 'UNKNOWN']
          },
          meal_timing: {
            type: Type.STRING,
            enum: ['BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD', 'EMPTY_STOMACH', 'NONE']
          },
          suggested_slots: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
              enum: ['MORNING', 'AFTERNOON', 'EVENING', 'BEDTIME']
            }
          },
          total_quantity: { type: Type.INTEGER },
          inferred_duration_days: { type: Type.INTEGER }
        },
        required: [
          'medicine_name',
          'strength',
          'dosage_quantity',
          'frequency_pattern',
          'meal_timing',
          'suggested_slots',
          'total_quantity',
          'inferred_duration_days'
        ]
      }
    }
  },
  required: ['confidence_score', 'is_pharmacy_receipt', 'items']
};

export async function parsePharmacyReceipt(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractionResponse> {
  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimeType
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      imagePart,
      {
        text: 'Extract all medications, dosage parameters, instructions, and meal relations from this document.'
      }
    ],
    config: {
      systemInstruction: `You are a clinical transcription engine for pharmacy receipts. Extract medications, dosage, frequency, meal timing, and duration according to the schema. Exclude non-pharmaceutical items (syringes, gloves, fees, taxes).`,
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: EXTRACTION_SCHEMA
    }
  });

  const parsed = JSON.parse(response.text ?? '{}') as ExtractionResponse;
  return postProcessExtraction(parsed);
}

// Deterministic Blacklist & Fallback Guardrails
const EXCLUDED_KEYWORDS = [
  'syringe', 'needle', 'gloves', 'mask', 'cotton', 'gauze', 'bandage',
  'consultation', 'doctor fee', 'service charge', 'delivery', 'tax', 'gst', 'vat'
];

function postProcessExtraction(data: ExtractionResponse): ExtractionResponse {
  if (!data.items || !Array.isArray(data.items)) {
    return { confidence_score: data.confidence_score ?? 0, is_pharmacy_receipt: false, items: [] };
  }

  const cleanedItems = data.items
    .filter((item) => {
      const lower = item.medicine_name.toLowerCase();
      return !EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw));
    })
    .map((item) => {
      // Slot fallback if AI yielded an empty slot list
      if (!item.suggested_slots || item.suggested_slots.length === 0) {
        if (item.frequency_pattern === 'TWICE_DAILY') item.suggested_slots = ['MORNING', 'EVENING'];
        else if (item.frequency_pattern === 'THRICE_DAILY') item.suggested_slots = ['MORNING', 'AFTERNOON', 'EVENING'];
        else if (item.frequency_pattern === 'FOUR_TIMES_DAILY') item.suggested_slots = ['MORNING', 'AFTERNOON', 'EVENING', 'BEDTIME'];
        else item.suggested_slots = ['MORNING'];
      }

      // Enforce safe default duration (minimum 1 day, fallback 7)
      if (!item.inferred_duration_days || item.inferred_duration_days <= 0) {
        item.inferred_duration_days = 7;
      }

      return item;
    });

  return {
    ...data,
    items: cleanedItems
  };
}
```

&nbsp;

---

## 4\. Antigravity Prompting Checklist

When instructing Antigravity to build the solution, provide the documents in this order:

1. `tablet_ai_prd.md` (Product scope & UX behavior)  
2. `tablet_ai_tech_spec.md` (Database models, BullMQ queues, Telegram Webhook)  
3. `gemini_vision_engine_spec.md` (This file: Gemini prompt, schema, and API service)

### Suggested Directive for Antigravity:

> *"Implement the tablet.ai application using the PRD, Technical Spec, and Gemini Vision Extraction Engine spec. Use Fastify/Node.js with TypeScript for the backend, Next.js 14 for the client, PostgreSQL with Prisma for the database, and BullMQ with Redis for the delayed nudge queue. Wire the `/api/v1/scans/process` route directly to the Gemini extraction pipeline defined in `gemini_vision_engine_spec.md`."*