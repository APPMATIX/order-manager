'use server';
/**
 * @fileOverview An AI flow to extract structured data from an image of a purchase bill.
 *
 * - extractBillDetails - A function that analyzes a bill image and returns structured data.
 * - ExtractBillDetailsInput - The input type for the extractBillDetails function.
 * - ExtractBillDetailsOutput - The return type for the extractBillDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LineItemSchema = z.object({
  itemName: z.string().describe('The name or description of the line item.'),
  quantity: z.number().describe('The quantity of the item purchased.'),
  costPerUnit: z
    .number()
    .describe('The cost or price for a single unit of the item.'),
  unit: z.string().optional().describe('The unit of measurement (e.g., kg, box).'),
});

const ExtractBillDetailsInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image of a purchase bill or invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractBillDetailsInput = z.infer<
  typeof ExtractBillDetailsInputSchema
>;

const ExtractBillDetailsOutputSchema = z.object({
  vendorName: z.string().describe("The name of the vendor or supplier."),
  vendorTrn: z.string().optional().describe("The vendor's Tax Registration Number (TRN), if present."),
  vendorAddress: z.string().optional().describe("The vendor's address, if present."),
  billDate: z
    .string()
    .describe("The date of the bill in YYYY-MM-DD format."),
  subTotal: z.number().optional().describe('The subtotal amount before any taxes.'),
  vatAmount: z.number().optional().describe('The total VAT amount, if listed separately.'),
  totalAmount: z.number().describe('The final total amount of the bill.'),
  lineItems: z
    .array(LineItemSchema)
    .describe('An array of all line items found on the bill.'),
});
export type ExtractBillDetailsOutput = z.infer<
  typeof ExtractBillDetailsOutputSchema
>;

export async function extractBillDetails(
  input: ExtractBillDetailsInput
): Promise<ExtractBillDetailsOutput> {
  return extractBillDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBillDetailsPrompt',
  input: {schema: ExtractBillDetailsInputSchema},
  output: {schema: ExtractBillDetailsOutputSchema},
  prompt: `You are an expert accountant specializing in data entry. Your task is to analyze the provided image of a bill or invoice and extract the following information in a structured JSON format.

  - The vendor's name.
  - The vendor's TRN (Tax Registration Number), if available.
  - The vendor's address, if available.
  - The date of the bill.
  - The subtotal (total before tax).
  - The total VAT amount.
  - The final total amount.
  - A list of all individual line items, including their description, quantity, unit, and unit price.

  Analyze the following image: {{media url=imageDataUri}}`,
});

const extractBillDetailsFlow = ai.defineFlow(
  {
    name: 'extractBillDetailsFlow',
    inputSchema: ExtractBillDetailsInputSchema,
    outputSchema: ExtractBillDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
