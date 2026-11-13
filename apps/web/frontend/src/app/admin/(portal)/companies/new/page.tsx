import type { Metadata } from "next";
import { CompanyCreateForm } from "../company-create-form";

export const metadata: Metadata = { title: "New company — Call CRM Admin" };

export default function NewCompanyPage() {
  return <CompanyCreateForm />;
}
