-- =============================================================================
-- SCRIPT DE UNIFICACIÓN DE CLIENTES DUPLICADOS - ELEVASHOP
-- Fecha: 2026-01-18
-- =============================================================================
-- Este script:
-- 1. Mueve transacciones del duplicado al principal
-- 2. Mueve ventas del duplicado al principal
-- 3. Mueve unidades_inventario del duplicado al principal
-- 4. Suma totales de compras y órdenes al principal
-- 5. Desactiva el cliente duplicado
-- =============================================================================

BEGIN;

-- Función para unificar un cliente duplicado con el principal
-- Uso: SELECT merge_client(principal_id, duplicado_id);

CREATE OR REPLACE FUNCTION merge_client(p_principal_id INT, p_duplicado_id INT)
RETURNS TEXT AS $$
DECLARE
    v_trans_count INT;
    v_ventas_count INT;
    v_unidades_count INT;
    v_dup_compras DECIMAL;
    v_dup_ordenes INT;
    v_dup_nombre TEXT;
BEGIN
    -- Obtener datos del duplicado
    SELECT nombre, total_compras, cantidad_ordenes
    INTO v_dup_nombre, v_dup_compras, v_dup_ordenes
    FROM clientes WHERE id = p_duplicado_id;

    IF v_dup_nombre IS NULL THEN
        RETURN 'ERROR: Cliente duplicado ' || p_duplicado_id || ' no encontrado';
    END IF;

    -- 1. Mover transacciones
    UPDATE transacciones SET cliente_id = p_principal_id WHERE cliente_id = p_duplicado_id;
    GET DIAGNOSTICS v_trans_count = ROW_COUNT;

    -- 2. Mover ventas
    UPDATE ventas SET cliente_id = p_principal_id WHERE cliente_id = p_duplicado_id;
    GET DIAGNOSTICS v_ventas_count = ROW_COUNT;

    -- 3. Mover unidades de inventario
    UPDATE unidades_inventario SET cliente_id = p_principal_id WHERE cliente_id = p_duplicado_id;
    GET DIAGNOSTICS v_unidades_count = ROW_COUNT;

    -- 4. Sumar totales al principal
    UPDATE clientes
    SET total_compras = total_compras + v_dup_compras,
        cantidad_ordenes = cantidad_ordenes + v_dup_ordenes,
        updated_at = NOW()
    WHERE id = p_principal_id;

    -- 5. Desactivar duplicado
    UPDATE clientes
    SET activo = false,
        nombre = nombre || ' [DUPLICADO DE ' || p_principal_id || ']',
        updated_at = NOW()
    WHERE id = p_duplicado_id;

    RETURN 'OK: ' || v_dup_nombre || ' -> Principal ' || p_principal_id ||
           ' (Trans:' || v_trans_count || ', Ventas:' || v_ventas_count ||
           ', Unidades:' || v_unidades_count || ')';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- EJECUTAR UNIFICACIONES
-- =============================================================================

-- 1. ADRIAN CHACIN (261) <- ADRAIN CHACIN (331)
SELECT merge_client(261, 331);

-- 2. CARLOS LIRA: El principal es el que tiene más datos
--    CARLO LIRA (353) tiene $1000, CARLOS LIRA (204) tiene $440
--    Usamos CARLO LIRA como principal por tener más compras
SELECT merge_client(353, 204);

-- 3. DAVID ARISTIGUIETA (352) tiene $1020, DAVID ARISTIGUEETA (316) tiene $880
SELECT merge_client(352, 316);

-- 4. EDINSON CHACON (321) $9380 <- EDISON CHACON (297) $3320
SELECT merge_client(321, 297);

-- 5. FRANCISCO MOTISI (196) $11310 <- FRANCISCO MOTSI (205), FRANCISCO MOTISI GARANTIA (366)
SELECT merge_client(196, 205);
SELECT merge_client(196, 366);

-- 6. G. FONSELEVEZ 2022 C.A (193) $121990 <- todas las variantes
SELECT merge_client(193, 294);  -- FONSELEVEZ
SELECT merge_client(193, 287);  -- G. FONSELEVEZ
SELECT merge_client(193, 320);  -- G FONSELEVEZ 2022
SELECT merge_client(193, 290);  -- G.FONSELEVVEZ 2022 C.A
SELECT merge_client(193, 263);  -- G FONSELEVEZ 2022 CA

-- 7. JUAN ORTIZ (206) $2500 <- JUAN ORTEZ (338) $1050
SELECT merge_client(206, 338);

-- 8. SALVATORE PAULINI (226) $11090 <- variantes
SELECT merge_client(226, 310);  -- SALVATORE PAOLINI
SELECT merge_client(226, 295);  -- SALVATORE PASCUALE
SELECT merge_client(226, 229);  -- SALVATORE PAULIN

-- 9. SERV TECNO-MIYELIS (201) $1340 <- variantes
SELECT merge_client(201, 203);  -- SERV TECNO-MIYELS
SELECT merge_client(201, 202);  -- SERV TECNO-MYELIS

-- 10. VECTOR ELEVATOR PART C.A. (212) $32595 <- VECTOR ELEVATOR PART (200)
SELECT merge_client(212, 200);

-- =============================================================================
-- VERIFICAR RESULTADOS
-- =============================================================================

SELECT 'Clientes desactivados (duplicados):' as info;
SELECT id, nombre, activo, total_compras
FROM clientes
WHERE activo = false
ORDER BY id;

SELECT 'Clientes principales actualizados:' as info;
SELECT id, nombre, total_compras, cantidad_ordenes
FROM clientes
WHERE id IN (261, 353, 352, 321, 196, 193, 206, 226, 201, 212)
ORDER BY total_compras DESC;

-- Limpiar función temporal
DROP FUNCTION IF EXISTS merge_client(INT, INT);

COMMIT;
