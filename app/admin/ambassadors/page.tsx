import MemberManager from "@/components/admin/MemberManager";

export default function AmbassadorsPage() {
  return (
    <MemberManager
      title="Ambassadors"
      subtitle="Student ambassadors representing CAPHA"
      filterCategories={["ambassador"]}
      availableCategories={[{ value: "ambassador", label: "Ambassador" }]}
      defaultCategory="ambassador"
    />
  );
}
