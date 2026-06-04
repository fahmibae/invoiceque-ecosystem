"use client";

import React from "react";
import Image from "next/image";

export type ContractPaperSize = "a4" | "f4";

type ContractPaperSettings = {
  label: string;
  widthMm: number;
  heightMm: number;
  printSize: string;
  budgets: {
    single: number;
    first: number;
    middle: number;
    last: number;
  };
};

export const CONTRACT_PAPER_SIZES: Record<
  ContractPaperSize,
  ContractPaperSettings
> = {
  a4: {
    label: "A4",
    widthMm: 210,
    heightMm: 297,
    printSize: "A4",
    budgets: {
      single: 47,
      first: 55,
      middle: 63,
      last: 67,
    },
  },
  f4: {
    label: "F4",
    widthMm: 215,
    heightMm: 330,
    printSize: "215mm 330mm",
    budgets: {
      single: 56,
      first: 66,
      middle: 76,
      last: 68,
    },
  },
};

const PAPER_SIZE_OPTIONS = Object.keys(
  CONTRACT_PAPER_SIZES,
) as ContractPaperSize[];

const isSectionHeader = (text: string) =>
  /^[0-9]+\.\s+[A-Z\s]+$/.test(text) ||
  /^[IVX]+\.\s+[A-Z\s]+$/.test(text) ||
  (text.length > 3 &&
    text === text.toUpperCase() &&
    !text.startsWith("-") &&
    !text.startsWith("*") &&
    !text.includes(":"));

const splitLongLine = (line: string, maxChars = 420): string[] => {
  const trimmed = line.trim();

  if (
    !trimmed ||
    trimmed.length <= maxChars ||
    trimmed.startsWith("-") ||
    trimmed.startsWith("*") ||
    isSectionHeader(trimmed)
  ) {
    return [line];
  }

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > maxChars) {
    let breakAt = remaining.lastIndexOf(" ", maxChars);
    if (breakAt < maxChars * 0.55) {
      breakAt = maxChars;
    }
    chunks.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
};

const getBodyLines = (text: string) =>
  text
    .split("\n")
    .flatMap((line) => splitLongLine(line))
    .filter((line, index, lines) => line.trim() || index < lines.length - 1);

const getLineCost = (line: string) => {
  const trimmed = line.trim();

  if (!trimmed) return 0.5;
  if (isSectionHeader(trimmed)) return 2;
  if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
    return Math.max(1, Math.ceil(trimmed.length / 96));
  }
  if (
    trimmed.includes(":") &&
    trimmed.length < 80 &&
    !trimmed.startsWith("http")
  ) {
    return Math.max(1, Math.ceil(trimmed.length / 110));
  }

  return Math.max(1, Math.ceil(trimmed.length / 104));
};

const getLinesCost = (lines: string[]) =>
  lines.reduce((total, line) => total + getLineCost(line), 0);

const takePage = (lines: string[], budget: number) => {
  const page: string[] = [];
  let pageCost = 0;

  while (lines.length > 0) {
    const nextLine = lines[0];
    const nextCost = getLineCost(nextLine);

    if (page.length > 0 && pageCost + nextCost > budget) {
      break;
    }

    page.push(lines.shift() || "");
    pageCost += nextCost;

    if (nextCost > budget) {
      break;
    }
  }

  return page;
};

export const paginateContractBody = (
  text: string,
  paperSize: ContractPaperSize,
) => {
  const lines = getBodyLines(text || "");
  const budgets = CONTRACT_PAPER_SIZES[paperSize].budgets;

  if (lines.length === 0) {
    return [[]];
  }

  if (getLinesCost(lines) <= budgets.single) {
    return [lines];
  }

  const remaining = [...lines];
  const pages: string[][] = [takePage(remaining, budgets.first)];

  if (remaining.length === 0) {
    pages.push([]);
    return pages;
  }

  while (remaining.length > 0 && getLinesCost(remaining) > budgets.last) {
    pages.push(takePage(remaining, budgets.middle));
  }

  pages.push(remaining);
  return pages;
};

const renderFormattedLines = (lines: string[], keyPrefix: string) =>
  lines.map((line, idx) => {
    const trimmed = line.trim();
    const key = `${keyPrefix}-${idx}`;

    if (!trimmed) return <div key={key} className="h-2" />;

    if (isSectionHeader(trimmed)) {
      return (
        <h4
          key={key}
          className="mt-2 mb-1 border-b border-slate-200 pb-1 font-sans text-sm font-bold uppercase leading-tight tracking-wide text-slate-900"
        >
          {trimmed}
        </h4>
      );
    }

    if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      const content = trimmed.substring(1).trim();

      return (
        <div
          key={key}
          className="my-px ml-4 flex items-start gap-2 text-justify text-xs leading-[1.32] text-slate-700"
        >
          <span className="mt-1 shrink-0 font-bold text-indigo-500">
            &bull;
          </span>
          <span>{content}</span>
        </div>
      );
    }

    if (
      trimmed.includes(":") &&
      trimmed.length < 80 &&
      !trimmed.startsWith("http")
    ) {
      const parts = trimmed.split(":");
      const label = parts[0].trim();
      const value = parts.slice(1).join(":").trim();

      return (
        <p
          key={key}
          className="my-px font-sans text-xs leading-[1.32] text-slate-700"
        >
          <strong className="font-sans text-[10px] font-bold uppercase tracking-wide text-slate-900">
            {label}:
          </strong>{" "}
          {value}
        </p>
      );
    }

    return (
      <p
        key={key}
        className="my-px indent-6 text-justify text-xs leading-[1.32] text-slate-700"
      >
        {trimmed}
      </p>
    );
  });

type ContractPaperSizePickerProps = {
  value: ContractPaperSize;
  onChange: (size: ContractPaperSize) => void;
  className?: string;
};

export function ContractPaperSizePicker({
  value,
  onChange,
  className = "",
}: ContractPaperSizePickerProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        Ukuran Kertas
      </span>
      <div className="inline-flex overflow-hidden rounded-lg border border-border-color bg-bg-card p-0.5">
        {PAPER_SIZE_OPTIONS.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            className={`min-w-10 px-3 py-1.5 text-xs font-bold transition-colors ${
              value === size
                ? "rounded-md bg-indigo-600 text-white shadow-sm"
                : "rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            {CONTRACT_PAPER_SIZES[size].label}
          </button>
        ))}
      </div>
    </div>
  );
}

type ContractPrintStyleProps = {
  paperSize: ContractPaperSize;
  rootSelector: string;
};

export function ContractPrintStyle({
  paperSize,
  rootSelector,
}: ContractPrintStyleProps) {
  const settings = CONTRACT_PAPER_SIZES[paperSize];

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          @page {
            size: ${settings.printSize};
            margin: 0;
          }

          @media print {
            html,
            body {
              width: ${settings.widthMm}mm !important;
              min-height: ${settings.heightMm}mm !important;
              background: #FFFFFF !important;
              color: #000000 !important;
            }

            body * {
              visibility: hidden !important;
            }

            ${rootSelector},
            ${rootSelector} * {
              visibility: visible !important;
            }

            ${rootSelector} {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              display: block !important;
              width: ${settings.widthMm}mm !important;
              max-width: none !important;
              background: #FFFFFF !important;
            }

            ${rootSelector} .contract-paper {
              width: ${settings.widthMm}mm !important;
              max-width: none !important;
              height: ${settings.heightMm}mm !important;
              min-height: ${settings.heightMm}mm !important;
              margin: 0 !important;
              padding: 9mm !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              page-break-after: always !important;
              break-after: page !important;
              overflow: hidden !important;
            }

            ${rootSelector} .contract-paper:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }

            ${rootSelector} .contract-page-number,
            .no-print {
              display: none !important;
            }
          }
        `,
      }}
    />
  );
}

type ContractPaperPreviewProps = {
  rootId: string;
  paperSize: ContractPaperSize;
  documentTitle: string;
  documentLabel: React.ReactNode;
  reference: string;
  officialLabel: string;
  bodyText: string;
  companyName: string;
  logoUrl?: string;
  logoAlt?: string;
  email?: string;
  phone?: string;
  website?: string;
  firstPartyLabel: string;
  firstPartyName: string;
  firstPartySignature?: string | null;
  firstPartyDateText: string;
  firstPartyUnsignedText: string;
  secondPartyLabel: string;
  secondPartyName: string;
  secondPartySignature?: string | null;
  secondPartyDateText: string;
  secondPartyUnsignedText: string;
  footerId: string;
  className?: string;
};

export function ContractPaperPreview({
  rootId,
  paperSize,
  documentTitle,
  documentLabel,
  reference,
  officialLabel,
  bodyText,
  companyName,
  logoUrl,
  logoAlt,
  email,
  phone,
  website,
  firstPartyLabel,
  firstPartyName,
  firstPartySignature,
  firstPartyDateText,
  firstPartyUnsignedText,
  secondPartyLabel,
  secondPartyName,
  secondPartySignature,
  secondPartyDateText,
  secondPartyUnsignedText,
  footerId,
  className = "",
}: ContractPaperPreviewProps) {
  const settings = CONTRACT_PAPER_SIZES[paperSize];
  const pages = paginateContractBody(bodyText, paperSize);
  const paperStyle: React.CSSProperties = {
    width: `${settings.widthMm}mm`,
    minHeight: `${settings.heightMm}mm`,
    maxWidth: "100%",
  };
  const watermarkInitial = (companyName || "I").charAt(0);

  return (
    <div
      id={rootId}
      className={`contract-print-root flex w-full flex-col items-center gap-6 ${className}`}
    >
      {pages.map((pageLines, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === pages.length - 1;

        return (
          <section
            key={`${paperSize}-${pageIndex}`}
            className="contract-paper relative mx-auto flex flex-col overflow-hidden rounded-sm border border-slate-200 bg-[#FCFCFA] p-5 text-left font-serif text-slate-800 shadow-xl ring-1 ring-black/5 transition-all sm:p-8"
            style={paperStyle}
          >
            <div className="pointer-events-none absolute inset-0 flex select-none items-center justify-center opacity-[0.02]">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt=""
                  width={384}
                  height={384}
                  unoptimized
                  className="h-96 w-96 object-contain grayscale"
                />
              ) : (
                <div className="font-sans text-[240px] font-black text-slate-950">
                  {watermarkInitial}
                </div>
              )}
            </div>

            <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
              {isFirstPage ? (
                <>
                  <div className="relative z-[1] mb-3 flex w-full flex-col items-start justify-between gap-2 border-b-[3px] border-red-500 pb-2 font-sans sm:flex-row">
                    <div className="min-w-0">
                      <div className="mb-2 flex h-11 w-11 items-center justify-center overflow-hidden rounded-sm text-base font-extrabold text-white">
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt={logoAlt || "Business Logo"}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-auto object-cover"
                          />
                        ) : (
                          companyName.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <h2 className="bg-gradient-to-br from-red-600 to-red-500 bg-clip-text font-sans text-[28px] font-black uppercase text-transparent print:!bg-none print:!text-red-600">
                        {documentLabel}
                      </h2>
                    </div>

                    <div className="flex w-full min-w-0 flex-col text-left sm:w-auto sm:max-w-[58%] sm:items-end sm:text-right">
                      <div className="mb-1 max-w-full break-words text-base font-bold text-slate-900">
                        {companyName}
                      </div>
                      {email && (
                        <div className="max-w-full break-all text-[13px] text-slate-600">
                          {email}
                        </div>
                      )}
                      {phone && (
                        <div className="max-w-full text-[13px] text-slate-600">
                          {phone}
                        </div>
                      )}
                      {website && (
                        <div className="max-w-full break-all text-[13px] text-slate-600">
                          {website}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-2 rounded-md border-l-[3px] border-red-500 bg-slate-50 p-2 font-sans">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">
                          Judul Dokumen
                        </span>
                        <h3 className="break-words text-base font-bold text-slate-900">
                          {documentTitle}
                        </h3>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <div className="mb-1 font-mono text-[13px] font-bold text-slate-900">
                          {reference}
                        </div>
                        <span className="inline-flex rounded-md bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
                          {officialLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2 font-sans text-[10px] uppercase tracking-widest text-slate-400">
                  <span className="truncate pr-4 font-bold text-slate-500">
                    {documentTitle}
                  </span>
                  <span className="contract-page-number shrink-0">
                    Page {pageIndex + 1} / {pages.length}
                  </span>
                </div>
              )}

              <div className="min-h-0 flex-1 text-sm leading-[1.32] text-slate-800">
                {renderFormattedLines(pageLines, `contract-page-${pageIndex}`)}
              </div>

              {isLastPage && (
                <div className="mt-3 shrink-0 border-t border-slate-200 pt-3 font-sans">
                  <div className="grid grid-cols-2 gap-5 text-center text-[10px]">
                    <div className="flex flex-col items-center">
                      <p className="mb-2 font-semibold uppercase tracking-wider text-slate-500">
                        {firstPartyLabel}
                      </p>
                      <div className="mb-1.5 flex h-10 items-center justify-center">
                        {firstPartySignature ? (
                          <Image
                            src={firstPartySignature}
                            alt="First Party Signature"
                            width={180}
                            height={56}
                            unoptimized
                            className="max-h-full w-auto object-contain mix-blend-multiply"
                          />
                        ) : (
                          <div className="flex h-8 w-24 items-center justify-center border-b border-dashed border-slate-300 font-mono text-[9px] italic text-slate-400">
                            {firstPartyUnsignedText}
                          </div>
                        )}
                      </div>
                      <div className="mb-1 h-px w-36 bg-slate-400" />
                      <p className="font-sans font-medium text-slate-800">
                        {firstPartyName}
                      </p>
                      <p className="font-mono text-[9px] text-slate-400">
                        Date: {firstPartyDateText}
                      </p>
                    </div>

                    <div className="flex flex-col items-center">
                      <p className="mb-2 font-semibold uppercase tracking-wider text-slate-500">
                        {secondPartyLabel}
                      </p>
                      <div className="mb-1.5 flex h-10 items-center justify-center">
                        {secondPartySignature ? (
                          <Image
                            src={secondPartySignature}
                            alt="Second Party Signature"
                            width={180}
                            height={56}
                            unoptimized
                            className="max-h-full w-auto object-contain mix-blend-multiply"
                          />
                        ) : (
                          <div className="flex h-8 w-24 items-center justify-center border-b border-dashed border-slate-300 font-mono text-[9px] italic text-slate-400">
                            {secondPartyUnsignedText}
                          </div>
                        )}
                      </div>
                      <div className="mb-1 h-px w-36 bg-slate-400" />
                      <p className="font-sans font-medium text-slate-800">
                        {secondPartyName}
                      </p>
                      <p className="font-mono text-[9px] text-slate-400">
                        Date: {secondPartyDateText}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2 text-center font-mono text-[8px] text-slate-400">
                    <span>
                      &copy; {new Date().getFullYear()} InvoiceQu. All rights
                      reserved.
                    </span>
                    <span>&bull;</span>
                    <span>ID: {footerId}</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
