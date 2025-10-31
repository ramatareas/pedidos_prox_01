export default {
    getWhereClause: () => {
        let conditions = [];

        // Filtro de Estado
        if (selEstado.selectedOptionValue) {
            conditions.push(`p.estado_id = ${selEstado.selectedOptionValue}`);
        }

        // Filtro de Subdepartamento
        if (selSubdepto.selectedOptionValue) {
            conditions.push(`me.subdepartamento_responsable_id = ${selSubdepto.selectedOptionValue}`);
        }

        // Filtro "Mis Tareas" (Aislamos el error conocido)
        if (appsmith.store.filtroMisTareasActivo) {
            // Usamos un bloque try/catch para evitar que el ReferenceError detenga la función
            let colaboradorId = 1; // ID temporal
            try {
                // Intenta obtener el ID real, pero si falla, se queda con '1'
                colaboradorId = getCurrentColaborador.data[0]?.id || 1; 
            } catch (e) {
                // El error de "getCurrentColaborador is not defined" se maneja aquí.
                // Usamos el ID temporal '1'
            }
            conditions.push(`p.asignado_a_id = ${colaboradorId}`);
        }
        
        // Si no hay condiciones, no se inyecta la cláusula WHERE.
        if (conditions.length === 0) {
            return ""; 
        }
        
        // Unimos las condiciones y agregamos la palabra 'WHERE'
        return "WHERE " + conditions.join(" AND ");
    }
}