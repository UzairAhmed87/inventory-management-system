import React from 'react';
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 24, fontFamily: "Helvetica", fontSize: 10 },
  table: { width: "100%", borderWidth: 1, borderColor: "#ccc", marginBottom: 16 },
  row: { flexDirection: "row" },
  cell: { flex: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#ccc", padding: 4 },
  header: { fontWeight: "bold", backgroundColor: "#f2f2f2" },
});

export const MonthlySummaryPDF = ({ data, title, subtitle, companyName }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={{ fontSize: 16, textAlign: "center", marginBottom: 8 }}>{companyName}</Text>
      <Text style={{ fontSize: 12, textAlign: "center", marginBottom: 4 }}>{title}</Text>
      <Text style={{ fontSize: 9, textAlign: "center", marginBottom: 10 }}>{subtitle}</Text>
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.header]}>Date</Text>
          <Text style={[styles.cell, styles.header]}>Invoice No</Text>
          <Text style={[styles.cell, styles.header]}>Description</Text>
          <Text style={[styles.cell, styles.header]}>Amount</Text>
        </View>
        {data.map((row, idx) => (
          <View style={styles.row} key={idx}>
            <Text style={styles.cell}>{row.Date}</Text>
            <Text style={styles.cell}>{row['Invoice No']}</Text>
            <Text style={styles.cell}>{row.Description}</Text>
            <Text style={styles.cell}>{row.Amount}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <Text style={{ fontSize: 8, color: 'grey' }}>Generated: {new Date().toLocaleString()}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 8, color: 'grey' }}>Software developed by Uzair Ahmed</Text>
            <Text style={{ fontSize: 8, color: 'grey' }}>03172146698</Text>
          </View>
        </View>
    </Page>
  </Document>
); 