export default {
    getWhereClause: () => {
        let conditions = [];
        
        // Obtener valores de los gráficos
        const pieChartX = Chart3.selectedDataPoint?.x; 
        const porCobrarX = chartPorCobrar.selectedDataPoint?.x;
        const atrasadoX = chartAtrasados.selectedDataPoint?.x;
        const enTiempoX = chartEnTiempo.selectedDataPoint?.x; 

        // --- PRIORIDAD 1: FILTRO DE GRÁFICOS ---
        
        if (!!pieChartX) {
            // Chart3: Pedidos Pendientes/Cotizados por Colaborador
            const colaborador = getColaboradores.data.find(c => c.nombre === pieChartX);
            const colaboradorId = colaborador?.id;

            if (colaboradorId) {
                // CORRECCIÓN: Añadir ::integer para forzar el tipo
                conditions.push(`p.asignado_a_id = ${colaboradorId}::integer`);
                conditions.push(`p.estado_id = 1`); 
            } else {
                conditions.push(`p.asignado_a_id = 0`); // Sin resultados
            }
        } 
        
        else if (!!porCobrarX) {
            // ChartPorCobrar: Pedidos Entregados por Cliente
            const cliente = getClientes_filtro.data.find(c => c.nombre === porCobrarX);
            const clienteId = cliente?.id;

            if (clienteId) {
                // CORRECCIÓN: Añadir ::integer
                conditions.push(`p.cliente_id = ${clienteId}::integer`);
                conditions.push(`p.estado_id = 9`); // ID 9: Entregado
            } else {
                conditions.push(`p.cliente_id = 0`); // Sin resultados
            }
        } 
        
        else if (!!atrasadoX) { 
            // ChartAtrasados: Estados con al menos 1 pedido atrasado
            conditions.push(`me.estado_interno = '${atrasadoX}' AND p.fecha_plazo < NOW()`);
        } 
        
        else if (!!enTiempoX) {
            // ChartEnTiempo: Estados en flujo (Este gráfico incluye la lógica de tiempo en su consulta)
            conditions.push(`me.estado_interno = '${enTiempoX}'`); 
        } 
        
        // --- PRIORIDAD 2: FILTROS DESPLEGABLES ---
        else {
            // Filtro Estado
            if (!!(selEstado.selectedOptionValue)) {
                conditions.push(`p.estado_id = ${selEstado.selectedOptionValue}::integer`); 
            }
            // Filtro Cliente
            if (!!(selCliente_filtro.selectedOptionValue)) {
                conditions.push(`p.cliente_id = ${selCliente_filtro.selectedOptionValue}::integer`);
            }
            
            // Filtro Mis Tareas / Asignado A
            if (appsmith.store.filtroMisTareasActivo) {
                // Se asume que getCurrentColaboradorId.data[0]?.id devuelve el ID del usuario
                let colaboradorId = getCurrentColaboradorId.data[0]?.id || 1; 
                conditions.push(`p.asignado_a_id = ${colaboradorId}::integer`);
            } 
            else if (!!(selAsignadoA_filtro.selectedOptionValue)) {
                // CORRECCIÓN: Añadir ::integer
                conditions.push(`p.asignado_a_id = ${selAsignadoA_filtro.selectedOptionValue}::integer`);
            }
        }
        
        if (conditions.length === 0) {
            return ""; 
        }
        
        return " AND " + conditions.join(" AND ");
    }
}