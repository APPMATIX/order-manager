'use server';
/**
 * @fileOverview AI Data Extraction Flow
 * 
 * Purpose: Analyzes images of purchase bills using Gemini 2.5 Flash 
 * to automate manual data entry for Vendors.
 * 
 * Interface:
 * - extractBillDetails(input: ExtractBillDetailsInput): Promise<ExtractBillDetailsOutput>
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
      "An image of a purchase bill, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
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
  prompt: `You are an expert accountant specializing in data entry. Analyze the image and extract vendor details, dates, taxes, and individual line items into structured JSON.

  Analyze: {{media url=imageDataUri}}`,
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
