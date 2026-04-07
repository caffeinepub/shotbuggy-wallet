import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheck, Copy, Download, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useLedgerTransfer } from "../hooks/useLedgerTransfer";
import { useCallerPrincipal, useRecordTransaction } from "../hooks/useQueries";
import QRCodeDisplay from "./QRCodeDisplay";

export default function SendReceiveCard() {
  const { data: principal } = useCallerPrincipal();
  const { identity } = useInternetIdentity();
  const { mutateAsync: recordTx } = useRecordTransaction();
  const { mutateAsync: ledgerTransfer, isPending } = useLedgerTransfer();

  const [token, setToken] = useState("ICP");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [copied, setCopied] = useState(false);

  const networkFee = token === "ICP" ? "0.0001" : "~0";
  const feeSuffix = token === "ICP" ? "($0.001)" : "(varies)";

  async function handleSend() {
    if (!recipient.trim()) {
      toast.error("Please enter a recipient address");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!identity) {
      toast.error("Not connected. Please reconnect your wallet.");
      return;
    }

    let status = "Failed";
    let errorMessage = "Transaction failed. Please try again.";

    try {
      await ledgerTransfer({
        token: token as "ICP" | "SHBY",
        recipientPrincipal: recipient.trim(),
        amount: Number(amount),
        memo: memo || undefined,
        identity,
      });
      status = "Confirmed";
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Transaction failed";
    }

    try {
      await recordTx({
        txType: "Send",
        token,
        amount,
        counterparty: recipient,
        status,
        memo: memo || "Transfer",
      });
    } catch {
      // recording failure shouldn't block UX
    }

    if (status === "Confirmed") {
      toast.success(`Successfully sent ${amount} ${token}`);
      setRecipient("");
      setAmount("");
      setMemo("");
    } else {
      toast.error(errorMessage);
    }
  }

  async function handleCopyAddress() {
    if (!principal) {
      toast.error("Address not loaded yet");
      return;
    }

    // Try modern Clipboard API first
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(principal);
        setCopied(true);
        toast.success("Address copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // fall through to execCommand fallback
      }
    }

    // Fallback: textarea + execCommand
    try {
      const textarea = document.createElement("textarea");
      textarea.value = principal;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        setCopied(true);
        toast.success("Address copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error("Failed to copy address");
      }
    } catch {
      toast.error("Failed to copy address");
    }
  }

  return (
    <Card className="border-border shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Send / Receive
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="send">
          <TabsList className="w-full mb-5">
            <TabsTrigger
              data-ocid="send_receive.send.tab"
              value="send"
              className="flex-1 gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </TabsTrigger>
            <TabsTrigger
              data-ocid="send_receive.receive.tab"
              value="receive"
              className="flex-1 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Receive
            </TabsTrigger>
          </TabsList>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Token
              </Label>
              <Select value={token} onValueChange={setToken}>
                <SelectTrigger data-ocid="send.token.select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ICP">
                    <div className="flex items-center gap-2">
                      <img
                        src="/assets/generated/icp-token-transparent.dim_48x48.png"
                        alt="ICP"
                        className="w-4 h-4 rounded-full"
                      />
                      ICP — Internet Computer
                    </div>
                  </SelectItem>
                  <SelectItem value="SHBY">
                    <div className="flex items-center gap-2">
                      <img
                        src="/assets/shby-019d6551-e049-714f-b3bf-3ef058287ba8.png"
                        alt="SHBY"
                        className="w-4 h-4 rounded-full"
                      />
                      SHBY — ShotBuggy Token
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Recipient Address (Principal)
              </Label>
              <Input
                data-ocid="send.recipient.input"
                placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Amount
              </Label>
              <Input
                data-ocid="send.amount.input"
                placeholder="0.00"
                type="number"
                min="0"
                step="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Memo (optional)
              </Label>
              <Input
                data-ocid="send.memo.input"
                placeholder="Payment memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
              style={{
                background: "oklch(0.96 0.01 240)",
                border: "1px solid oklch(0.90 0.01 240)",
              }}
            >
              <span className="text-muted-foreground">Network Fee</span>
              <span className="font-mono font-medium">
                {networkFee} {token}{" "}
                <span className="text-muted-foreground">{feeSuffix}</span>
              </span>
            </div>

            <Button
              data-ocid="send.submit.button"
              onClick={handleSend}
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" /> Send {token}
                </span>
              )}
            </Button>
          </TabsContent>

          {/* Receive Tab */}
          <TabsContent value="receive" className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Your Wallet Address
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  data-ocid="receive.address.input"
                  readOnly
                  value={principal ?? "Loading..."}
                  className="font-mono text-xs bg-muted/30"
                />
                <Button
                  data-ocid="receive.copy.button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAddress}
                  disabled={!principal}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <CheckCheck className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <QRCodeDisplay value={principal ?? ""} />
              <Button
                data-ocid="receive.copy_address.button"
                variant="outline"
                className="mt-4 w-full"
                onClick={handleCopyAddress}
                disabled={!principal}
              >
                {copied ? (
                  <CheckCheck className="w-4 h-4 mr-2 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Copy Address
              </Button>
            </div>

            <div
              className="rounded-lg p-3 text-xs text-center"
              style={{
                background: "oklch(0.96 0.03 145 / 0.4)",
                border: "1px solid oklch(0.88 0.06 145)",
                color: "oklch(0.4 0.12 145)",
              }}
            >
              Share this address to receive ICP or SHBY tokens
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
