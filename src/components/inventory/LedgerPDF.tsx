import React from 'react';
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { LedgerEntry } from '@/types';

const pdfStyles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    fontSize: 8,
  },
  companyName: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 4,
    color: '#1a237e',
  },
  title: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 2,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 9,
    textAlign: "center",
    marginBottom: 10,
    color: "grey",
  },
  table: {
    // display: "table", // Removed due to type error
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableColHeader: {
    width: "18%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f2f2f2",
    padding: 3,
    textAlign: 'center',
  },
  tableColHeaderDesc: {
    width: "28%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f2f2f2",
    padding: 3,
    textAlign: 'center',
  },
  tableCol: {
    width: "18%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 3,
    textAlign: 'center',
    wordBreak: 'break-all',
  },
  tableColDesc: {
    width: "28%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 3,
    textAlign: 'left',
    wordBreak: 'break-all',
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: "bold",
  },
  tableCell: {
    fontSize: 7,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    textAlign: 'right',
    fontSize: 8,
    color: 'grey',
  },
});

export const LedgerPDF = ({ data, title, subtitle, companyName }: { data: LedgerEntry[], title: string, subtitle: string, companyName: string }) => {
  const generatedDate = new Date().toLocaleString();
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page} wrap>
        <Text style={pdfStyles.companyName}>{companyName}</Text>
        <Text style={pdfStyles.title}>{title}</Text>
        <Text style={pdfStyles.subtitle}>{subtitle}</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRow}>
            <View style={pdfStyles.tableColHeader}><Text style={pdfStyles.tableCellHeader}>Date</Text></View>
            <View style={pdfStyles.tableColHeaderDesc}><Text style={pdfStyles.tableCellHeader}>Description</Text></View>
            <View style={pdfStyles.tableColHeader}><Text style={pdfStyles.tableCellHeader}>Debit</Text></View>
            <View style={pdfStyles.tableColHeader}><Text style={pdfStyles.tableCellHeader}>Credit</Text></View>
            <View style={pdfStyles.tableColHeader}><Text style={pdfStyles.tableCellHeader}>Balance</Text></View>
          </View>
          {data.map((row, index) => (
            <View style={pdfStyles.tableRow} key={index}>
              <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{row.Date}</Text></View>
              <View style={pdfStyles.tableColDesc}><Text style={pdfStyles.tableCell}>{row.Description}</Text></View>
              <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{row.Debit}</Text></View>
              <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{row.Credit}</Text></View>
              <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{row.Balance}</Text></View>
            </View>
          ))}
          {data.length > 0 && (
            <View style={pdfStyles.tableRow}>
              <View style={[pdfStyles.tableCol, { width: '82%', textAlign: 'right' }]}><Text style={[pdfStyles.tableCell, { fontWeight: 'bold' }]}>Total Balance</Text></View>
              <View style={pdfStyles.tableCol}><Text style={[pdfStyles.tableCell, { fontWeight: 'bold' }]}>{data[data.length - 1].Balance}</Text></View>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <Text style={{ fontSize: 8, color: 'grey' }}>Generated: {generatedDate}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 8, color: 'grey' }}>Software developed by Uzair Ahmed</Text>
            <Text style={{ fontSize: 8, color: 'grey' }}>03172146698</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}; 