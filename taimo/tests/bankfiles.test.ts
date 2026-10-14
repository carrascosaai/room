import { describe, expect, it } from 'vitest';

import { detectFormat, parseBankFile } from '../src/domain/bankfiles';
import { csvBankRows } from '../src/domain/csv';

const day = (iso: string) => iso.slice(0, 10);

describe('extractos de bancos de todo el mundo', () => {
  it('OFX (Chase, RBC, Barclays…)', () => {
    const ofx = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>USD
<BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261012120000[-5:EST]<TRNAMT>-45.67<FITID>1<NAME>AMAZON.COM*2K4&amp;X<MEMO>Online</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261001<TRNAMT>2500.00<FITID>2<NAME>PAYROLL</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const r = parseBankFile(ofx);
    expect(r.format).toBe('ofx');
    expect(r.rows).toEqual([{ date: expect.stringMatching(/^2026-10-12/), merchant: 'AMAZON.COM*2K4&X', amount: 4567, currency: 'USD' }]);
    expect(r.skipped).toBe(1);
  });

  it('QIF con fechas de EE. UU.', () => {
    const qif = `!Type:Bank
D10/03/2026
T-12.50
PStarbucks
^
D10/13/2026
T-100.00
PCostco
^
D10/14/2026
T1500.00
PSalary
^`;
    const r = parseBankFile(qif);
    expect(r.format).toBe('qif');
    expect(r.rows.map((x) => [day(x.date), x.merchant, x.amount])).toEqual([
      ['2026-10-03', 'Starbucks', 1250],
      ['2026-10-13', 'Costco', 10000],
    ]);
  });

  it('CAMT.053 (SEPA, Suiza, nórdicos)', () => {
    const xml = `<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><Stmt>
<Ntry><Amt Ccy="EUR">54.20</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-10-11</Dt></BookgDt>
<NtryDtls><TxDtls><RltdPties><Cdtr><Nm>REWE Markt GmbH</Nm></Cdtr></RltdPties><RmtInf><Ustrd>Kartenzahlung</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
<Ntry><Amt Ccy="CHF">12.00</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><DtTm>2026-10-12T09:00:00</DtTm></BookgDt><NtryDtls><TxDtls><RmtInf><Ustrd>Migros Zürich</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
<Ntry><Amt Ccy="EUR">3000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><BookgDt><Dt>2026-10-01</Dt></BookgDt></Ntry>
</Stmt></BkToCstmrStmt></Document>`;
    const r = parseBankFile(xml);
    expect(r.format).toBe('camt');
    expect(r.rows.map((x) => [day(x.date), x.merchant, x.amount, x.currency])).toEqual([
      ['2026-10-11', 'REWE Markt GmbH', 5420, 'EUR'],
      ['2026-10-12', 'Migros Zürich', 1200, 'CHF'],
    ]);
  });

  it('MT940 (Alemania, Países Bajos, Polonia)', () => {
    const mt = `:20:STARTUMS
:25:10020030/1234567
:28C:0
:60F:C261001EUR1000,00
:61:2610131013DR12,40NDDTNONREF
:86:106?00KARTENZAHLUNG?20SVWZ+Einkauf?32ALDI SUED
:61:2610141014CR500,00NTRFNONREF
:86:166?00GUTSCHRIFT?32ARBEITGEBER
:61:2610141014D8,90NMSCNONREF
:86:/TRTP/SEPA/NAME/Albert Heijn 1234/REMI/Boodschappen/
:62F:C261014EUR1478,70`;
    const r = parseBankFile(mt);
    expect(r.format).toBe('mt940');
    expect(r.rows.map((x) => [day(x.date), x.merchant, x.amount, x.currency])).toEqual([
      ['2026-10-13', 'ALDI SUED', 1240, 'EUR'],
      ['2026-10-14', 'Albert Heijn 1234', 890, 'EUR'],
    ]);
  });

  it('CSV en otros idiomas y con columnas de cargo/abono', () => {
    const de = 'Buchungstag;Verwendungszweck;Betrag;Währung\n13.10.2026;REWE SAGT DANKE;-23,45;EUR\n14.10.2026;Gehalt;2500,00;EUR\n';
    expect(csvBankRows(de).rows).toEqual([{ date: expect.stringMatching(/^2026-10-13/), merchant: 'REWE SAGT DANKE', amount: 2345, currency: 'EUR' }]);

    const uk = 'Date,Description,Money Out,Money In,Balance\n10/13/2026,TESCO STORES,12.30,,980.00\n10/14/2026,SALARY,,2000.00,2980.00\n';
    expect(csvBankRows(uk).rows.map((x) => [day(x.date), x.merchant, x.amount])).toEqual([['2026-10-13', 'TESCO STORES', 1230]]);

    const ru = 'Дата;Описание;Сумма\n13.10.2026;Пятёрочка;-1 250,00\n';
    expect(csvBankRows(ru).rows.map((x) => [x.merchant, x.amount])).toEqual([['Пятёрочка', 125000]]);

    const jp = '日付,内容,金額\n2026/10/13,セブンイレブン,-540\n';
    expect(csvBankRows(jp).rows.map((x) => [x.merchant, x.amount])).toEqual([['セブンイレブン', 54000]]);
  });

  it('reconoce cada formato', () => {
    expect(detectFormat('fecha;concepto;importe')).toBe('csv');
    expect(detectFormat('<OFX>')).toBe('ofx');
    expect(detectFormat('!Type:CCard\n')).toBe('qif');
  });
});
