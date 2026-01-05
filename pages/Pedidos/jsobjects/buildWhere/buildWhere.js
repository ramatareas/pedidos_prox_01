export default {
    getWhereClause: () => {
    let conditions = [];
    
    // --- EXTRACCIÓN Y LIMPIEZA DE DATOS ---
    const pieChartX = Chart3.selectedDataPoint?.x; 
    
    // EXTRACCIÓN CORRECTA PARA CHART CUSTOM
    let porCobrarX = null;
    const rawPC = chartPorCobrar.selectedDataPoint;
    if (rawPC) {
         // Intentamos leer rawEventData para Custom Chart
         if (rawPC.rawEventData && rawPC.rawEventData.name) {
             porCobrarX = rawPC.rawEventData.name;
         } 
         // Fallback para Basic Chart o estructura simple
         else if (rawPC.x || rawPC.name) {
             porCobrarX = rawPC.x || rawPC.name;
         }
         
         // Limpieza final
         if (porCobrarX && typeof porCobrarX === 'string') {
             porCobrarX = porCobrarX.trim();
         }
    }
    const atrasadoX = chartAtrasados.selectedDataPoint?.x;
    const enTiempoX = chartEnTiempo.selectedDataPoint?.x; 
    // --- LÓGICA DE FILTRADO ---
    
    // 1. Chart3 (Etapas)
    if (!!pieChartX) {
        const estado = getEstadosOrdenados.data.find(e => e.estado_interno === pieChartX);
        if (estado?.id) conditions.push(`p.estado_id = ${estado.id}::integer`);
        else conditions.push(`p.estado_id = 0`); 
    }
    
    // 2. Chart Por Cobrar (Clientes)
    else if (!!porCobrarX) {
        // Buscamos coincidencia exacta primero
        let cliente = getClientes_filtro.data.find(c => c.nombre && c.nombre.trim() === porCobrarX);
        
        // Coincidencia parcial por si acaso
        if (!cliente && porCobrarX.includes("...")) {
             const cleanSearch = porCobrarX.replace("...", "").trim();
             cliente = getClientes_filtro.data.find(c => c.nombre && c.nombre.startsWith(cleanSearch));
        }
        if (cliente?.id) {
            conditions.push(`p.cliente_id = ${cliente.id}::integer`);
            conditions.push(`p.estado_id = 9`); 
        } else {
            conditions.push(`p.cliente_id = 0`); 
        }
    } 
    
    // 3. Chart Atrasados
    else if (!!atrasadoX) { 
        conditions.push(`me.estado_interno = '${atrasadoX}' AND p.fecha_plazo < NOW()`);
    } 
    
    // 4. Chart En Tiempo
    else if (!!enTiempoX) {
        conditions.push(`me.estado_interno = '${enTiempoX}'`); 
    } 
    
    // 5. Filtros Manuales
    else {
        if (!!(selEstado.selectedOptionValue)) {
            conditions.push(`p.estado_id = ${selEstado.selectedOptionValue}::integer`); 
        }
        if (!!(selCliente_filtro.selectedOptionValue)) {
            conditions.push(`p.cliente_id = ${selCliente_filtro.selectedOptionValue}::integer`);
        }
        
        if (appsmith.store.filtroMisTareasActivo) {
            let colId = getCurrentColaboradorId.data[0]?.id || 1; 
            conditions.push(`p.asignado_a_id = ${colId}::integer`);
        } 
        else if (!!(selAsignadoA_filtro.selectedOptionValue)) {
            conditions.push(`p.asignado_a_id = ${selAsignadoA_filtro.selectedOptionValue}::integer`);
        }
    }
    
    if (conditions.length === 0) return ""; 
    return " AND " + conditions.join(" AND ");
}
}