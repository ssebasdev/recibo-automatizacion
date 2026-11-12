ALTER TABLE recibo_notificaciones
ADD COLUMN periodo VARCHAR(7);

UPDATE recibo_notificaciones
SET periodo = strftime('%m-%Y', creado_en);