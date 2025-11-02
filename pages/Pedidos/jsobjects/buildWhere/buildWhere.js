export default {
    getWhereClause: () => {
        let conditions = [];
        let chartFilterActive = false;
        
        // Obtenemos los valores seleccionados de los gráficos
        const atrasadoX = chartAtrasados.selectedDataPoint?.x;
        const enTiempoX = chartEnTiempo.selectedDataPoint?.x;
        const ambosX = chartAmbos.selectedDataPoint?.x;

        // Prioridad 1: Filtro de Gráfico (Atrasados)
        if (!!atrasadoX) { 
            conditions.push(`me.estado_interno = '${atrasadoX}' AND p.fecha_plazo < NOW()`);
            chartFilterActive = true;
        } 
        
        // Prioridad 1: Filtro de Gráfico (A Tiempo)
        else if (!!enTiempoX) {
            conditions.push(`me.estado_interno = '${enTiempoX}' AND p.fecha_plazo >= NOW()`);
            chartFilterActive = true;
        } 
        
        // Prioridad 1: Filtro de Gráfico (Ambos)
        else if (!!ambosX) {
            conditions.push(`me.estado_interno = '${ambosX}'`);
            chartFilterActive = true;
        }
        
        // Prioridad 2: Filtros Desplegables (SÓLO si NINGÚN gráfico está activo)
        else {
            // Filtro Estado
            if (!!(selEstado.selectedOptionValue)) {
                conditions.push(`p.estado_id = ${selEstado.selectedOptionValue}`);
            }
            // Filtro Cliente
            if (!!(selCliente_filtro.selectedOptionValue)) {
                conditions.push(`p.cliente_id = ${selCliente_filtro.selectedOptionValue}`);
            }
            
            // Filtro Mis Tareas / Asignado A
            if (appsmith.store.filtroMisTareasActivo) {
                let colaboradorId = 1; 
                try { colaboradorId = getCurrentColaborador.data[0]?.id || 1; } catch (e) {}
                conditions.push(`p.asignado_a_id = ${colaboradorId}`);
            } 
            else if (!!(selAsignadoA_filtro.selectedOptionValue)) {
                conditions.push(`p.asignado_a_id = ${selAsignadoA_filtro.selectedOptionValue}`);
            }
        }
        
        // Condición Final: Si el array está vacío, devolvemos cadena vacía.
        if (conditions.length === 0) {
            return ""; 
        }
        
        // Si HAY filtros, le agregamos la palabra AND al inicio.
        return " AND " + conditions.join(" AND ");
    }
}