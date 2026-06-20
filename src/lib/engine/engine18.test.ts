import { describe, it, expect } from "vitest";
import { parseForm4, classifyCode, summarizeInsider } from "./insider";

const SAMPLE = `<?xml version="1.0"?>
<ownershipDocument>
  <reportingOwner>
    <reportingOwnerId><rptOwnerName>Huang Jen-Hsun</rptOwnerName></reportingOwnerId>
    <reportingOwnerRelationship><isDirector>1</isDirector><isOfficer>1</isOfficer><officerTitle>President and CEO</officerTitle></reportingOwnerRelationship>
  </reportingOwner>
  <nonDerivativeTable>
    <nonDerivativeTransaction>
      <transactionDate><value>2024-06-13</value></transactionDate>
      <transactionCoding><transactionCode>S</transactionCode></transactionCoding>
      <transactionAmounts>
        <transactionShares><value>120000</value></transactionShares>
        <transactionPricePerShare><value>130.50</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
      <postTransactionAmounts><sharesOwnedFollowingTransaction><value>93400000</value></sharesOwnedFollowingTransaction></postTransactionAmounts>
    </nonDerivativeTransaction>
    <nonDerivativeTransaction>
      <transactionDate><value>2024-06-13</value></transactionDate>
      <transactionCoding><transactionCode>M</transactionCode></transactionCoding>
      <transactionAmounts>
        <transactionShares><value>120000</value></transactionShares>
        <transactionPricePerShare><value>3.48</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>A</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
    </nonDerivativeTransaction>
  </nonDerivativeTable>
</ownershipDocument>`;

describe("Form 4 parsing", () => {
  it("extracts owner, title and transactions", () => {
    const txs = parseForm4(SAMPLE);
    expect(txs.length).toBe(2);
    expect(txs[0].owner).toBe("Huang Jen-Hsun");
    expect(txs[0].title).toBe("President and CEO");
    expect(txs[0].shares).toBe(120000);
    expect(txs[0].price).toBeCloseTo(130.5, 4);
    expect(txs[0].value).toBeCloseTo(120000 * 130.5, 2);
    expect(txs[0].sharesAfter).toBe(93400000);
  });

  it("classifies the sale and the exercise correctly", () => {
    const txs = parseForm4(SAMPLE);
    expect(txs[0].action).toBe("Sell");
    expect(txs[0].isSell).toBe(true);
    expect(txs[1].action).toBe("Exercise");
    expect(txs[1].isBuy).toBe(false);
    expect(txs[1].isSell).toBe(false);
  });

  it("classifyCode maps the key codes", () => {
    expect(classifyCode("P")).toMatchObject({ action: "Buy", isBuy: true });
    expect(classifyCode("S")).toMatchObject({ action: "Sell", isSell: true });
    expect(classifyCode("A").action).toBe("Grant");
    expect(classifyCode("Z").action).toBe("Z");
  });

  it("skips zero-share transactions and handles missing price", () => {
    const xml = `<ownershipDocument><reportingOwner><reportingOwnerId><rptOwnerName>X</rptOwnerName></reportingOwnerId></reportingOwner>
      <nonDerivativeTransaction><transactionCoding><transactionCode>P</transactionCode></transactionCoding>
      <transactionAmounts><transactionShares><value>0</value></transactionShares></transactionAmounts></nonDerivativeTransaction>
      <nonDerivativeTransaction><transactionCoding><transactionCode>P</transactionCode></transactionCoding>
      <transactionAmounts><transactionShares><value>500</value></transactionShares></transactionAmounts></nonDerivativeTransaction></ownershipDocument>`;
    const txs = parseForm4(xml);
    expect(txs.length).toBe(1);
    expect(txs[0].price).toBe(0);
  });

  it("summarizes net buying vs selling", () => {
    const sells = summarizeInsider(parseForm4(SAMPLE));
    expect(sells.signal).toBe("Net selling");
    expect(sells.sellValue).toBeGreaterThan(0);
    expect(sells.buyValue).toBe(0);
    expect(sells.sellers).toContain("Huang Jen-Hsun");
  });
});
