import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, ExternalLink, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

type HallmarkData = {
  id: number;
  thId: string;
  userId: number | null;
  appId: string;
  appName: string;
  productName: string;
  releaseType: string;
  metadata: Record<string, any>;
  dataHash: string;
  txHash: string;
  blockHeight: string;
  qrCodeSvg: string | null;
  verificationUrl: string;
  hallmarkId: number;
  createdAt: string;
};

export function GenesisHallmarkBadge() {
  const [open, setOpen] = useState(false);

  const { data: genesis, isLoading } = useQuery<HallmarkData>({
    queryKey: ["/api/hallmark/genesis"],
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-[11px]">Loading hallmark...</span>
      </div>
    );
  }

  if (!genesis) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 rounded-lg p-2.5 transition-colors"
        data-testid="button-genesis-hallmark"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-[11px] font-semibold text-foreground">Genesis Hallmark</p>
          <p className="text-[10px] text-muted-foreground font-mono">{genesis.thId}</p>
        </div>
        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate ml-auto text-[9px] shrink-0">
          Verified
        </Badge>
      </button>

      <GenesisHallmarkDetail open={open} onOpenChange={setOpen} genesis={genesis} />
    </>
  );
}

function GenesisHallmarkDetail({
  open,
  onOpenChange,
  genesis,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  genesis: HallmarkData;
}) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast({ title: "Copied", description: `${field} copied to clipboard` });
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const metadata = genesis.metadata || {};

  const infoRows = [
    { label: "Application", value: genesis.appName },
    { label: "Version", value: metadata.version || "1.0.0" },
    { label: "Domain", value: metadata.domain || "trustvault.tlid.io" },
    { label: "Release Type", value: genesis.releaseType },
    { label: "Product", value: genesis.productName },
  ];

  const blockchainRows = [
    { label: "Hallmark ID", value: genesis.thId, copyable: true },
    { label: "Data Hash", value: genesis.dataHash, copyable: true, truncate: true },
    { label: "TX Hash", value: genesis.txHash, copyable: true, truncate: true },
    { label: "Block Height", value: genesis.blockHeight },
    { label: "Created", value: genesis.createdAt ? new Date(genesis.createdAt).toLocaleString() : "N/A" },
  ];

  const ecosystemRows = [
    { label: "Ecosystem", value: metadata.ecosystem || "Trust Layer" },
    { label: "Consensus", value: metadata.consensus || "Proof of Trust" },
    { label: "Chain", value: metadata.chain || "Trust Layer Blockchain" },
    { label: "Native Asset", value: metadata.nativeAsset || "SIG" },
    { label: "Utility Token", value: metadata.utilityToken || "Shells" },
    { label: "Operator", value: metadata.operator || "DarkWave Studios LLC" },
    { label: "Parent App", value: metadata.parentApp || "Trust Layer Hub" },
    { label: "Parent Genesis", value: metadata.parentGenesis || "TH-00000001" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background border-white/10 text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            Genesis Hallmark
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg theme-gradient p-4 mt-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-lg font-bold text-white font-mono" data-testid="text-genesis-id">{genesis.thId}</p>
              <p className="text-[11px] text-white/60 mt-0.5">{genesis.appName} &mdash; {genesis.productName}</p>
            </div>
            <Badge className="no-default-hover-elevate no-default-active-elevate bg-white/15 text-white border-white/20 text-[10px]">
              Genesis Block
            </Badge>
          </div>
        </div>

        <div className="space-y-4 mt-2">
          <DetailSection title="Application Info" data-testid="section-app-info">
            {infoRows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </DetailSection>

          <Separator />

          <DetailSection title="Blockchain Record" data-testid="section-blockchain-record">
            {blockchainRows.map((row) => (
              <DetailRow
                key={row.label}
                label={row.label}
                value={row.value}
                truncate={row.truncate}
                copyable={row.copyable}
                isCopied={copiedField === row.label}
                onCopy={() => copyToClipboard(row.value, row.label)}
              />
            ))}
          </DetailSection>

          <Separator />

          <DetailSection title="Ecosystem Details" data-testid="section-ecosystem-details">
            {ecosystemRows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </DetailSection>

          <Separator />

          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Verification</p>
            <div className="flex flex-col gap-1.5">
              <Button
                asChild
                variant="outline"
                size="sm"
                data-testid="link-verify-genesis"
              >
                <a
                  href={genesis.verificationUrl || `/api/hallmark/${genesis.thId}/verify`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Verify Hallmark
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                data-testid="link-parent-genesis"
              >
                <a
                  href="https://dwtl.io/api/hallmark/TH-00000001/verify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2 justify-start text-muted-foreground"
                >
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  Parent Genesis: TH-00000001
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailSection({
  title,
  children,
  ...rest
}: {
  title: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div className="space-y-2" {...rest}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  truncate,
  copyable,
  isCopied,
  onCopy,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  copyable?: boolean;
  isCopied?: boolean;
  onCopy?: () => void;
}) {
  const displayValue = truncate && value?.length > 20
    ? `${value.slice(0, 10)}...${value.slice(-10)}`
    : value;

  return (
    <div className="flex items-center justify-between gap-2" data-testid={`row-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-[11px] font-medium text-foreground text-right ${truncate ? "font-mono" : ""} truncate`}>
          {displayValue}
        </span>
        {copyable && onCopy && (
          <button
            onClick={onCopy}
            className="shrink-0 p-0.5 rounded transition-colors text-muted-foreground"
            data-testid={`button-copy-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {isCopied ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
