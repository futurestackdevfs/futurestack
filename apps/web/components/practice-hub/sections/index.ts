import type { ComponentType } from "react";
import type { SectionProps } from "./ui";
import { FormsSection, InputsSection, OtpSection, SelectionSection } from "./basic";
import { ButtonsSection, ChangingSection, DynamicSection, TablesSection } from "./interact";
import { AdvancedSection, PopupsSection, LabSection, ShoppingSection } from "./advanced";

export type { SectionProps };

export const SECTIONS: Record<string, ComponentType<SectionProps>> = {
  inputs: InputsSection,
  forms: FormsSection,
  otp: OtpSection,
  selection: SelectionSection,
  buttons: ButtonsSection,
  tables: TablesSection,
  dynamic: DynamicSection,
  changing: ChangingSection,
  popups: PopupsSection,
  advanced: AdvancedSection,
  shopping: ShoppingSection,
  lab: LabSection,
};
