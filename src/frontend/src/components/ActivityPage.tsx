import RecentActivityTable from "./RecentActivityTable";

export default function ActivityPage() {
  return (
    <div className="animate-fade-in" data-ocid="activity.page">
      <h2 className="text-xl font-display font-bold mb-5">
        Transaction History
      </h2>
      <RecentActivityTable />
    </div>
  );
}
