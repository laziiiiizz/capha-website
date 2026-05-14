import MemberManager from "@/components/admin/MemberManager";

export default function MembersPage() {
  return (
    <MemberManager
      title="Members"
      subtitle="All CAPHA team members — leadership, advisors, and ambassadors"
      filterCategories={["founder", "co-founder", "academic-director", "advisor", "ambassador-coordinator", "ambassador"]}
      availableCategories={[
        { value: "founder", label: "Founder" },
        { value: "co-founder", label: "Co-Founder" },
        { value: "academic-director", label: "Academic Director" },
        { value: "advisor", label: "Advisor" },
        { value: "ambassador-coordinator", label: "Ambassador Coordinator" },
        { value: "ambassador", label: "Ambassador" },
      ]}
      defaultCategory="advisor"
    />
  );
}
