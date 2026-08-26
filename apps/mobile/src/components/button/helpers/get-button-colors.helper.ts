import { UnistylesThemes } from "react-native-unistyles";

export type ButtonRadius = "rounded" | "circular";
export type ButtonSize = "sm" | "md" | "lg" | "xl";
export type ButtonState = "press" | "default" | "disabled";
export type ButtonVariant = "text" | "ghost" | "filled" | "outlined";
export type ButtonColor =
  | "info"
  | "error"
  | "primary"
  | "success"
  | "warning"
  | "secondary";

export type ButtonColors = {
  color: string;
  borderColor: string;
  backgroundColor: string;
};

type Theme = UnistylesThemes[keyof UnistylesThemes];

export function getButtonColors(
  theme: Theme,
  variant: ButtonVariant,
  color: ButtonColor,
  state: ButtonState = "default",
): ButtonColors {
  const disabled = {
    color: theme.colors.slate7,
    borderColor: theme.colors.slate3,
    backgroundColor: theme.colors.slate2,
  };

  const maps: Record<
    ButtonColor,
    Record<ButtonVariant, Record<ButtonState, Partial<ButtonColors>>>
  > = {
    primary: {
      filled: {
        default: {
          color: theme.colors.white,
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.primary,
        },
        press: {
          borderColor: theme.colors.primaryPress,
          backgroundColor: theme.colors.primaryPress,
        },
        disabled,
      },
      outlined: {
        default: {
          color: theme.colors.primary10,
          backgroundColor: "transparent",
          borderColor: theme.colors.primary8,
        },
        press: {
          color: theme.colors.primary11,
          borderColor: theme.colors.primary11,
        },
        disabled,
      },
      ghost: {
        default: {
          color: theme.colors.primary10,
          borderColor: theme.colors.primarySubtle,
          backgroundColor: theme.colors.primarySubtle,
        },
        press: {
          borderColor: theme.colors.primary4,
          backgroundColor: theme.colors.primary4,
        },
        disabled,
      },
      text: {
        default: {
          color: theme.colors.primary10,
          borderColor: "transparent",
          backgroundColor: "transparent",
        },
        press: { backgroundColor: theme.colors.primary4 },
        disabled: { color: theme.colors.slate7 },
      },
    },
    secondary: {
      filled: {
        default: {
          color: theme.colors.background,
          borderColor: theme.colors.secondary,
          backgroundColor: theme.colors.secondary,
        },
        press: {
          borderColor: theme.colors.secondaryPress,
          backgroundColor: theme.colors.secondaryPress,
        },
        disabled,
      },
      outlined: {
        default: {
          color: theme.colors.slate12,
          backgroundColor: "transparent",
          borderColor: theme.colors.slate5,
        },
        press: {
          borderColor: theme.colors.slate7,
          backgroundColor: theme.colors.slate2,
        },
        disabled,
      },
      ghost: {
        default: {
          color: theme.colors.slate12,
          borderColor: theme.colors.secondarySubtle,
          backgroundColor: theme.colors.secondarySubtle,
        },
        press: {
          borderColor: theme.colors.slate5,
          backgroundColor: theme.colors.slate5,
        },
        disabled,
      },
      text: {
        default: {
          color: theme.colors.slate12,
          borderColor: "transparent",
          backgroundColor: "transparent",
        },
        press: { backgroundColor: theme.colors.slate4 },
        disabled: { color: theme.colors.slate7 },
      },
    },
    error: {
      filled: {
        default: {
          color: theme.colors.white,
          borderColor: theme.colors.error,
          backgroundColor: theme.colors.error,
        },
        press: {
          borderColor: theme.colors.errorPress,
          backgroundColor: theme.colors.errorPress,
        },
        disabled,
      },
      outlined: {
        default: {
          color: theme.colors.red10,
          backgroundColor: "transparent",
          borderColor: theme.colors.red8,
        },
        press: {
          color: theme.colors.red11,
          borderColor: theme.colors.red11,
        },
        disabled,
      },
      ghost: {
        default: {
          color: theme.colors.red10,
          borderColor: theme.colors.errorSubtle,
          backgroundColor: theme.colors.errorSubtle,
        },
        press: {
          borderColor: theme.colors.red5,
          backgroundColor: theme.colors.red5,
        },
        disabled,
      },
      text: {
        default: {
          color: theme.colors.red10,
          borderColor: "transparent",
          backgroundColor: "transparent",
        },
        press: { backgroundColor: theme.colors.red4 },
        disabled: { color: theme.colors.slate7 },
      },
    },
    success: {
      filled: {
        default: {
          color: theme.colors.white,
          borderColor: theme.colors.success,
          backgroundColor: theme.colors.success,
        },
        press: {
          borderColor: theme.colors.successPress,
          backgroundColor: theme.colors.successPress,
        },
        disabled,
      },
      outlined: {
        default: {
          color: theme.colors.green10,
          backgroundColor: "transparent",
          borderColor: theme.colors.green8,
        },
        press: {
          color: theme.colors.green11,
          borderColor: theme.colors.green11,
        },
        disabled,
      },
      ghost: {
        default: {
          color: theme.colors.green10,
          borderColor: theme.colors.successSubtle,
          backgroundColor: theme.colors.successSubtle,
        },
        press: {
          borderColor: theme.colors.green5,
          backgroundColor: theme.colors.green5,
        },
        disabled,
      },
      text: {
        default: {
          color: theme.colors.green10,
          borderColor: "transparent",
          backgroundColor: "transparent",
        },
        press: { backgroundColor: theme.colors.green4 },
        disabled: { color: theme.colors.slate7 },
      },
    },
    warning: {
      filled: {
        default: {
          color: theme.colors.white,
          borderColor: theme.colors.warning,
          backgroundColor: theme.colors.warning,
        },
        press: {
          borderColor: theme.colors.warningPress,
          backgroundColor: theme.colors.warningPress,
        },
        disabled,
      },
      outlined: {
        default: {
          color: theme.colors.amber10,
          backgroundColor: "transparent",
          borderColor: theme.colors.amber7,
        },
        press: {
          color: theme.colors.amber11,
          borderColor: theme.colors.amber11,
        },
        disabled,
      },
      ghost: {
        default: {
          color: theme.colors.amber11,
          borderColor: theme.colors.warningSubtle,
          backgroundColor: theme.colors.warningSubtle,
        },
        press: {
          borderColor: theme.colors.amber4,
          backgroundColor: theme.colors.amber4,
        },
        disabled,
      },
      text: {
        default: {
          color: theme.colors.amber11,
          borderColor: "transparent",
          backgroundColor: "transparent",
        },
        press: { backgroundColor: theme.colors.amber3 },
        disabled: { color: theme.colors.slate7 },
      },
    },
    info: {
      filled: {
        default: {
          color: theme.colors.white,
          borderColor: theme.colors.info,
          backgroundColor: theme.colors.info,
        },
        press: {
          borderColor: theme.colors.infoPress,
          backgroundColor: theme.colors.infoPress,
        },
        disabled,
      },
      outlined: {
        default: {
          color: theme.colors.blue10,
          backgroundColor: "transparent",
          borderColor: theme.colors.blue8,
        },
        press: {
          color: theme.colors.blue11,
          borderColor: theme.colors.blue11,
        },
        disabled,
      },
      ghost: {
        default: {
          color: theme.colors.blue10,
          borderColor: theme.colors.infoSubtle,
          backgroundColor: theme.colors.infoSubtle,
        },
        press: {
          borderColor: theme.colors.blue5,
          backgroundColor: theme.colors.blue5,
        },
        disabled,
      },
      text: {
        default: {
          color: theme.colors.blue10,
          borderColor: "transparent",
          backgroundColor: "transparent",
        },
        press: { backgroundColor: theme.colors.blue4 },
        disabled: { color: theme.colors.slate7 },
      },
    },
  };

  return {
    color: theme.colors.white,
    borderColor: "transparent",
    backgroundColor: "transparent",
    ...maps[color][variant].default,
    ...maps[color][variant][state],
  };
}
