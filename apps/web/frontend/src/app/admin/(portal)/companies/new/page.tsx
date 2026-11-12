import type { Metadata } from "next";
import { CompanyCreateForm } from "../company-create-form";

export const metadata: Metadata = { title: "New company — Call CRM Admin" };

export default async function NewCompanyPage({ searchParams }: PageProps<"/admin/companies/new">) {
  const { error, notice } = await searchParams;
  return (
    <>
      <h1>New company</h1>
      <CompanyCreateForm error={typeof error === "string" ? error : undefined} notice={typeof notice === "string" ? notice : undefined} />
    </>
  );
}
