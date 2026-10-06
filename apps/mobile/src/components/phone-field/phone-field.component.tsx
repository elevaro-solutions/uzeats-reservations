import { Input } from "../input";
import { Typography } from "../typography";
import {
  formatUsPhoneNational,
  phoneInputValue,
} from "@/lib/helpers/phone.helpers";

export type PhoneFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
};

/** US phone field. Stores E.164 when complete, otherwise the partial national digits. */
export function PhoneField({
  label = "Phone number",
  value,
  onChangeText,
  onBlur,
  error = false,
  helperText,
  required = false,
}: PhoneFieldProps) {
  return (
    <Input
      label={label}
      required={required}
      value={formatUsPhoneNational(value)}
      onBlur={onBlur}
      onChangeText={(text) => onChangeText(phoneInputValue(text))}
      placeholder="(212) 555-1234"
      keyboardType="phone-pad"
      autoComplete="tel"
      textContentType="telephoneNumber"
      prefix={
        <Typography size="text-sm" color="secondary">
          +1
        </Typography>
      }
      error={error}
      helperText={helperText}
    />
  );
}
