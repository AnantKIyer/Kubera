import type { Appearance } from "@clerk/types";

/**
 * Flatten Clerk chrome into Kubera’s auth shell — one light surface, no dark footer slab.
 * Colors are literal (not Tailwind dark: tokens) so OS dark mode can’t paint Clerk black.
 */
export const kuberaClerkAppearance = {
  layout: {
    logoPlacement: "none",
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
    showOptionalFields: false,
  },
  variables: {
    colorPrimary: "hsl(152 38% 34%)",
    colorDanger: "hsl(0 55% 48%)",
    colorSuccess: "hsl(152 38% 34%)",
    colorWarning: "hsl(32 90% 42%)",
    colorText: "hsl(160 10% 12%)",
    colorTextOnPrimaryBackground: "hsl(0 0% 100%)",
    colorTextSecondary: "hsl(160 6% 42%)",
    // Opaque — transparent makes Clerk’s footer fall back to near-black
    colorBackground: "hsl(0 0% 100%)",
    colorInputBackground: "hsl(150 8% 96%)",
    colorInputText: "hsl(160 10% 12%)",
    colorNeutral: "hsl(160 6% 42%)",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-sans), -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "15px",
  },
  elements: {
    rootBox: "mx-auto w-full",
    cardBox: "!shadow-none !border-0 !bg-transparent w-full overflow-visible",
    card: "!shadow-none !border-0 !bg-transparent !p-0 w-full gap-4 overflow-visible",
    scrollBox: "!bg-transparent overflow-visible",
    header: "!hidden",
    headerTitle: "!hidden",
    headerSubtitle: "!hidden",
    main: "!gap-4 overflow-visible",
    form: "!gap-4 overflow-visible",
    formFieldRow: "!overflow-visible",
    formField: "!overflow-visible",
    // Label + “Forgot password” on one row
    formFieldLabelRow:
      "!mb-1.5 !flex !w-full !items-center !justify-between !gap-2 !overflow-visible",
    formFieldLabel:
      "!m-0 !text-[13px] !font-medium !leading-5 !text-[hsl(160_6%_42%)] !overflow-visible",
    formFieldAction:
      "!m-0 !text-[13px] !font-medium !text-[hsl(152_38%_34%)] hover:!opacity-80",
    formFieldInputWrapper: "!overflow-visible",
    formFieldInput:
      "!box-border !flex !h-11 !min-h-11 !w-full !items-center !rounded-[12px] !border !border-[hsl(160_8%_88%)] !bg-[hsl(150_8%_96%)] !px-3 !text-[15px] !leading-none !text-[hsl(160_10%_12%)] !shadow-none focus:!ring-2 focus:!ring-[hsl(152_38%_34%)]/20 focus:!border-[hsl(152_38%_34%)]/40",
    // Primary CTA — centered label; hide Clerk’s tiny arrow (reads as a glitch)
    formButtonPrimary:
      "!box-border !inline-flex !min-h-11 !h-auto !items-center !justify-center !gap-0 !rounded-xl !border-0 !bg-[hsl(152_38%_34%)] !px-4 !py-2.5 !text-[15px] !font-semibold !leading-none !text-white !shadow-none hover:!opacity-90",
    buttonArrowIcon: "!hidden",
    formButtonPrimaryIcon: "!hidden",
    footer:
      "!bg-transparent !bg-none !shadow-none !border-0 !mt-4 !pt-0 ![background:transparent]",
    footerAction: "!bg-transparent !text-[13px] !text-[hsl(160_6%_42%)]",
    footerActionText: "!text-[hsl(160_6%_42%)]",
    footerActionLink:
      "!font-semibold !text-[hsl(152_38%_34%)] hover:!opacity-80",
    footerPages: "!bg-transparent",
    footerPagesLink: "!text-[hsl(160_6%_42%)]",
    socialButtons: "!gap-2",
    socialButtonsBlockButton:
      "!box-border !inline-flex !h-11 !min-h-11 !items-center !justify-center !rounded-xl !border !border-[hsl(160_8%_88%)] !bg-[hsl(150_8%_97%)] !px-3 !shadow-none !text-[hsl(160_10%_12%)] hover:!bg-[hsl(150_8%_94%)]",
    socialButtonsBlockButtonText:
      "!text-[15px] !font-medium !leading-none !text-[hsl(160_10%_12%)]",
    socialButtonsProviderIcon: "!w-4 !h-4",
    lastAuthenticationStrategyBadge:
      "!static !ml-2 !translate-x-0 !translate-y-0 !bg-[hsl(152_38%_34%)]/12 !text-[hsl(152_38%_34%)] !text-[10px] !font-medium",
    formFieldHintText: "!text-[hsl(160_6%_42%)]",
    formFieldSuccessText: "!text-[hsl(152_38%_34%)]",
    formFieldErrorText: "!text-[hsl(0_55%_48%)]",
    identityPreviewEditButton: "!text-[hsl(152_38%_34%)]",
    dividerLine: "!bg-[hsl(160_8%_88%)]",
    dividerText: "!text-[hsl(160_6%_42%)] !text-[12px]",
    alternativeMethodsBlockButton:
      "!border !border-[hsl(160_8%_88%)] !bg-[hsl(150_8%_97%)] !text-[hsl(160_10%_12%)]",
    otpCodeFieldInput: "!border-[hsl(160_8%_88%)] !text-[hsl(160_10%_12%)]",
    badge:
      "!normal-case !bg-[hsl(32_90%_42%)]/12 !text-[hsl(32_90%_42%)] !shadow-none",
  },
} satisfies Appearance;
