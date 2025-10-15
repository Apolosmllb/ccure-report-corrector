import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";

export default function App() {
  const [previewRows, setPreviewRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef(null);

  const TARGET_FIELDS = [
    "Numero",
    "Name",
    "Door Name",
    "Message Type",
    "Message Text",
    "Date/Time",
  ];

  function reset() {
    setPreviewRows([]);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: false,
        defval: "",
      });
      if (!rows.length) return;

      // Si no hay header explícito para fecha, intentar detectar columna de fechas
      const headerRow = rows[0].map((h) => String(h).trim());
      let messageTextIdx = headerRow.findIndex((h) =>
        /message\s*text/i.test(h)
      );

      // Buscar todas las fechas en el archivo (en cualquier columna)
      const datePattern =
        /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s+\d{1,2}:\d{2}:\d{2}\b/;
      const allDates = [];
      for (const row of rows) {
        for (const cell of row) {
          const match = String(cell).match(datePattern);
          if (match) allDates.push(match[0]);
        }
      }
      console.log("🚀 ~ onFile ~ allDates:", allDates);

      // Buscar columna Message Text si no existe header
      if (messageTextIdx === -1) {
        messageTextIdx = headerRow.findIndex((h) => /text/i.test(h));
        if (messageTextIdx === -1) messageTextIdx = 0; // fallback primera columna
      }

      const dataRows = rows.slice(1);
      const processed = buildRecordsFromMessageText(dataRows, messageTextIdx);

      const combined = processed.map((a, i) => ({
        ...a,
        "Date/Time": allDates[i],
      }));

      setPreviewRows(combined);
    };
    reader.readAsArrayBuffer(f);
  }

  function buildRecordsFromMessageText(rows, msgIdx, dateIdx) {
    const texts = [];
    const dates = [];
    let buffer = [];

    for (let i = 0; i < rows.length; i++) {
      const message = String(rows[i]?.[msgIdx] || "").trim();
      const dateCandidate = String(rows[i]?.[dateIdx] || "").trim();
      if (
        dateCandidate &&
        /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(dateCandidate)
      ) {
        dates.push(dateCandidate);
      }
      if (message) buffer.push(message);
      if (message.endsWith(".")) {
        texts.push(buffer.join(" ").replace(/\s+/g, " ").trim());
        buffer = [];
      }
    }

    if (buffer.length) texts.push(buffer.join(" ").replace(/\s+/g, " ").trim());

    // Si hay más fechas que textos, recorta; si hay menos, rellena
    while (dates.length < texts.length) dates.push("");

    return texts.map((text, idx) => parseMessageText(text, dates[idx]));
  }

  function parseMessageText(text, date) {
    const numero = text.match(/\(Card:\s*(\d+)\)/i)?.[1] || "";
    const name = text.match(/'(.*?)'/)?.[1] || "";
    const door = text.match(/en\s+'(.*?)'/i)?.[1] || "";
    const type = text.match(/^(Admitido|Denegado|Rechazado)/i)?.[1] || "";

    return {
      Numero: numero,
      Name: name,
      "Door Name": door,
      "Message Type": type,
      "Message Text": text,
      "Date/Time": date,
    };
  }

  function downloadFixed() {
    const ws = XLSX.utils.json_to_sheet(previewRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(
      wb,
      fileName
        ? fileName.replace(/\.xls[x]?$/i, "_fixed.xlsx")
        : "reporte_fixed.xlsx"
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">
          Corrector de Reportes C-CURE → Excel
        </h1>

        <div className="bg-white rounded-2xl shadow p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <label className="block text-sm font-medium">
                Subir archivo (.xls / .xlsx)
              </label>
              <input
                ref={inputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={onFile}
                className="mt-2 block"
              />
            </div>
            {previewRows.length > 0 && (
              <button
                className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
                onClick={downloadFixed}
              >
                Descargar Excel corregido
              </button>
            )}
          </div>

          {previewRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    {TARGET_FIELDS.map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 border-b text-left font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 100).map((row, i) => (
                    <tr key={i} className="odd:bg-white even:bg-gray-50">
                      {TARGET_FIELDS.map((h) => (
                        <td
                          key={h}
                          className="px-3 py-2 border-t border-gray-100 whitespace-pre-wrap"
                        >
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 100 && (
                <div className="text-xs text-gray-500 mt-2">
                  Mostrando 100 primeras filas de {previewRows.length}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
