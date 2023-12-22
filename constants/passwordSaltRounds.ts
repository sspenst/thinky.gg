//UserSchema.index({ calc_records: -1 });
export const PASSWORD_SALTROUNDS = process.env.NODE_ENV !== 'test' ? 10 : 1;
