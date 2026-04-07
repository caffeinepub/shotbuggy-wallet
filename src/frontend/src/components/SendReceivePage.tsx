import SendReceiveCard from "./SendReceiveCard";

export default function SendReceivePage() {
  return (
    <div
      className="max-w-xl mx-auto animate-fade-in"
      data-ocid="send_receive.page"
    >
      <h2 className="text-xl font-display font-bold mb-5">Send / Receive</h2>
      <SendReceiveCard />
    </div>
  );
}
