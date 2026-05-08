import {
  EmailSuppression,
  SuppressionReason,
} from './email-suppression.entity';

type EmailSuppressionUpsertData = Pick<
  EmailSuppression,
  'reason' | 'source' | 'notes'
>;

export type UpsertByEmailParams = {
  email: string;
  data: EmailSuppressionUpsertData;
};

export interface IEmailSuppressionRepository {
  findByEmail(email: string): Promise<EmailSuppression | null>;
  releaseAllExpired(params: {
    releaseTime: Date;
    reason: SuppressionReason;
  }): Promise<number>;
  upsertByEmail(params: UpsertByEmailParams): Promise<EmailSuppression>;
}

export const IEmailSuppressionRepository = Symbol(
  'IEmailSuppressionRepository',
);
