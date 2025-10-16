export function buildRecordsFromMessageText(rows, msgIdx) {
  const texts = [];
  const dates = [];
  let buffer = [];
  let lastDate = ""; // guarda la última fecha encontrada

  const datePattern =
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s+\d{1,2}:\d{2}:\d{2}\b/;

  for (let i = 0; i < rows.length; i++) {
    const message = String(rows[i]?.[msgIdx] || "").trim();
    if (!message) continue;

    // 🔹 Buscar una fecha dentro de toda la fila (en cualquier celda)
    const rowStr = rows[i].join(" ");
    const match = rowStr.match(datePattern);
    if (match) lastDate = match[0]; // actualizar fecha actual

    buffer.push(message);

    // 🔹 Cuando termina con punto, se cierra un bloque completo
    if (message.endsWith(".")) {
      texts.push(buffer.join(" ").replace(/\s+/g, " ").trim());
      dates.push(lastDate || ""); // si no hay, usar última conocida
      buffer = [];
    }
  }

  // Si quedó texto pendiente, agregarlo también
  if (buffer.length) {
    texts.push(buffer.join(" ").replace(/\s+/g, " ").trim());
    dates.push(lastDate || "");
  }

  // 🔹 Generar los registros finales
  return texts.map((text, idx) => parseMessageTextWithDate(text, dates[idx]));
}

function parseMessageTextWithDate(text, date) {
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
    "Date/Time": date || "",
  };
}
