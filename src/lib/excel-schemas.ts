import { z } from 'zod';

export const AccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['asset', 'liability']),
  balance: z.number(),
  currency: z.string(),
  category_id: z.number().optional(),
  subcategory: z.string().optional(),
  institution: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

export const HoldingSchema = z.object({
  account_id: z.number(),
  symbol: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().positive(),
  cost_basis: z.number().nonnegative(),
  current_price: z.number().optional(),
  date_acquired: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  notes: z.string().optional(),
});

export const InsuranceSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  company: z.string().optional(),
  policy_no: z.string().optional(),
  premium: z.number().nonnegative(),
  coverage: z.number().nonnegative(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
  status: z.enum(['active', 'expired', 'cancelled']),
  notes: z.string().optional(),
});

export const TransactionSchema = z.object({
  account_id: z.number(),
  transaction_type: z.enum(['income', 'expense', 'transfer', 'adjustment']),
  amount: z.number().positive(),
  balance_after: z.number().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  description: z.string().optional(),
  category_id: z.number().optional(),
  counterparty_id: z.number().optional(),
  reference_no: z.string().optional(),
});

const moduleSchemas = {
  accounts: AccountSchema,
  holdings: HoldingSchema,
  insurances: InsuranceSchema,
  transactions: TransactionSchema,
} as const;

const sheetNameToModule: Record<string, string> = {
  资产账户: 'accounts',
  负债账户: 'accounts',
  投资持仓: 'holdings',
  保险保单: 'insurances',
  交易记录: 'transactions',
  assets: 'accounts',
  liabilities: 'accounts',
  holdings: 'holdings',
  insurance: 'insurances',
  transactions: 'transactions',
};

export function detectModules(sheetNames: string[]): string[] {
  const detectedModules = new Set<string>();

  for (const sheetName of sheetNames) {
    const normalizedName = sheetName.trim().toLowerCase();
    const module = sheetNameToModule[normalizedName];
    if (module) {
      detectedModules.add(module);
    }
  }

  return Array.from(detectedModules);
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function parseAndValidate(
  moduleName: string,
  data: Record<string, unknown>[]
): { data: unknown[]; errors: ValidationError[] } {
  const schema = moduleSchemas[moduleName as keyof typeof moduleSchemas];

  if (!schema) {
    return {
      data: [],
      errors: [
        {
          row: 0,
          field: 'module',
          message: `Unknown module: ${moduleName}. Valid modules: ${Object.keys(moduleSchemas).join(', ')}`,
        },
      ],
    };
  }

  const validatedData: unknown[] = [];
  const errors: ValidationError[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 1;
    const result = schema.safeParse(row);

    if (result.success) {
      validatedData.push(result.data);
    } else {
      const zodErrors = result.error.issues;
      for (const error of zodErrors) {
        errors.push({
          row: rowNumber,
          field: error.path.join('.'),
          message: error.message,
        });
      }
    }
  });

  return { data: validatedData, errors };
}

export type ValidatedAccount = z.infer<typeof AccountSchema>;
export type ValidatedHolding = z.infer<typeof HoldingSchema>;
export type ValidatedInsurance = z.infer<typeof InsuranceSchema>;
export type ValidatedTransaction = z.infer<typeof TransactionSchema>;
