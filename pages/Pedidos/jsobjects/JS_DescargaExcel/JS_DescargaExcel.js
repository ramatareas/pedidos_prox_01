export default {
    async generateExcel() {
        try {
            if (typeof XLSX === 'undefined') {
                showAlert("Error: Falta lib XLSX", "error");
                return;
            }
            const selectedPedidos = tblPedidos.selectedRows;
            if (!selectedPedidos || selectedPedidos.length === 0) {
                showAlert("Selecciona pedidos", "warning");
                return;
            }
            showAlert("Procesando lista...", "info");
            let masterData = [];
            const regexProducto = /<b>\s*(\d+)[\s\xa0]*\(([^)]+)\)\s*<\/b>[\s\xa0]*-[\s\xa0]*(.*)/i;
            for (let i = 0; i < selectedPedidos.length; i++) {
                const p = selectedPedidos[i];
                const rawList = p.lista_solicitud || "";
                // Formateo de fechas
                const fechaCreacion = p.created_at ? new Date(p.created_at).toLocaleDateString() : "";
                const fechaPlazo = p.fecha_plazo ? new Date(p.fecha_plazo).toLocaleDateString() : "";
                if (!rawList) {
                    masterData.push({
                        "ID": p.id, // ID interno numérico
                        "Orden Compra": p.id_compra_cliente,
                        "Cliente": p.nombre_cliente,
                        "Fecha Creación": fechaCreacion,
                        "Fecha Plazo": fechaPlazo,
                        "Estado": p.estado_interno,
                        "Vendedor": p.nombre_asignado,
                        "Cantidad": 0, "Unidad": "", "Producto": "(Lista vacía)"
                    });
                    continue;
                }
                const items = rawList.split(/<br\s*\/?>/i);
                items.forEach(item => {
                    let cleanItem = item.trim();
                    if (!cleanItem) return;
                    const match = cleanItem.match(regexProducto);
                    let qty = 1;
                    let unit = "N/A";
                    let desc = cleanItem.replace(/<[^>]*>/g, "");
                    if (match) {
                        qty = Number(match[1]);
                        unit = match[2].trim();
                        desc = match[3].trim();
                    }
                    masterData.push({
                        "ID": p.id, // ID interno
                        "Orden Compra": p.id_compra_cliente,
                        "Cliente": p.nombre_cliente,
                        "Fecha Creación": fechaCreacion,
                        "Fecha Plazo": fechaPlazo, // Nueva columna
                        "Estado": p.estado_interno,
                        "Vendedor": p.nombre_asignado,
                        "Cantidad": qty,
                        "Unidad": unit,
                        "Producto": desc
                    });
                });
            }
            if (masterData.length === 0) {
                showAlert("Error: Lista vacía.", "warning"); return;
            }
            // Excluir 'id' interno si solo quieres 'Orden Compra', o dejar ambos. 
            // Aquí dejé ambos ("ID" y "Orden Compra")
            const ws = XLSX.utils.json_to_sheet(masterData);
            // Ajustar columnas
            ws['!cols'] = [
                { wch: 8 },  // ID
                { wch: 25 }, // Orden Compra
                { wch: 30 }, // Cliente
                { wch: 12 }, // Fecha Creación
                { wch: 12 }, // Fecha Plazo
                { wch: 15 }, // Estado
                { wch: 10 }, // Vendedor
                { wch: 10 }, // Cantidad
                { wch: 10 }, // Unidad
                { wch: 60 }  // Producto
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64', compression: true });
            const dataURI = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
            const dateStr = new Date().toISOString().slice(0, 10);
            download(dataURI, `Pedidos_Detallados_${dateStr}.xlsx`, 'url');
            showAlert("Excel listo.", "success");
        } catch (err) {
            console.error(err);
            showAlert("Error: " + err.message, "error");
        }
    }
}

