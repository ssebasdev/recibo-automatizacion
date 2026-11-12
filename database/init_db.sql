CREATE TABLE usuarios (
    id INTEGER primary key autoincrement,
    nombre varchar(100) not null,
    codigo varchar(10) not null,
    password varchar(255) not null,
    chat_id varchar(10) not null unique,
    creado_en datetime not null default current_timestamp
);

CREATE TABLE servicios (
    id INTEGER primary key autoincrement,
    nombre varchar(50) not null
);

CREATE TABLE usuarios_servicios (
    usuario_id INTEGER not null,
    servicio_id INTEGER not null,
    codigo_suministro varchar(10) not null unique,
    tipo_documento varchar(5),
    numero_documento varchar(15),
    primary key (usuario_id, servicio_id)
);

CREATE TABLE recibo_notificaciones (
    id INTEGER primary key autoincrement,
    usuario_id INTEGER not null references usuarios(id),
    servicio_id INTEGER not null references servicios(id),
    detalle_ocr text,
    bucket_url varchar(255),
    enviado boolean not null default false,
    creado_en datetime not null default current_timestamp
);