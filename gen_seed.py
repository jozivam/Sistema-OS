
import uuid
import random

company_id = "2f193dc6-1615-4131-a9be-5b4b7673b840"

sql = []

# Cleanup & Prep
sql.append(f"-- Preparação: Desativando restrições para permitir dados de teste fictícios")
sql.append(f"ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_id_fkey;")
sql.append(f"ALTER TABLE IF EXISTS public.service_orders DROP CONSTRAINT IF EXISTS service_orders_tech_id_fkey;")
sql.append(f"ALTER TABLE IF EXISTS public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;")
sql.append(f"ALTER TABLE IF EXISTS public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_receiver_id_fkey;")

sql.append(f"\n-- Limpeza de dados antigos para a empresa {company_id}")
sql.append(f"DELETE FROM stock_movements WHERE company_id = '{company_id}';")
sql.append(f"DELETE FROM service_orders WHERE company_id = '{company_id}';")
sql.append(f"DELETE FROM products WHERE company_id = '{company_id}';")
sql.append(f"DELETE FROM storage_locations WHERE company_id = '{company_id}';")
sql.append(f"DELETE FROM customers WHERE company_id = '{company_id}';")
sql.append(f"DELETE FROM suppliers WHERE company_id = '{company_id}';")
sql.append(f"DELETE FROM users WHERE company_id = '{company_id}';")
sql.append(f"DELETE FROM companies WHERE id = '{company_id}';")

# Re-insert Company
sql.append(f"\n-- Reinserindo Empresa")
sql.append(f"INSERT INTO companies (id, name, corporate_name, trade_name, document, email, phone, address, city, plan, plan_period, monthly_fee, status, settings, ativo, limite_usuarios) VALUES ('{company_id}', 'TEST TECH', 'TEST TECH', 'TEST TECH', '77777777777777', 'test12345@gmail.com', '63888888888', 'Rua Bom Jardim, Araguaína', 'Araguaína', 'DIAMANTE', 'TRIMESTRAL', 561.45, 'ACTIVE', '{{\"enableAI\": true, \"enableChat\": true, \"orderTypes\": [\"Instalação\", \"Manutenção\", \"Orçamento\", \"Retirada\", \"Suporte\", \"Levantamento\"], \"enableHistory\": true, \"enableAttachments\": true}}', true, 5);")

# Admin User (Maintain Session)
admin_id = "e1515601-9f2d-4747-98aa-ed00f26957da"
sql.append(f"\n-- Usuário Administrador (Mantendo Sessão)")
sql.append(f"INSERT INTO users (id, company_id, name, email, role, ativo, password) VALUES ('{admin_id}', '{company_id}', 'ADMIN TECH', 'admin@admin.com', 'Administrador', true, '123456');")

# 5 Technicians and their locations + Estoque Matriz
tech_names = ["Carlos Oliveira", "Bruno Santos", "Rafael Costa", "Marcelo Lima", "Andre Silva"]
tech_ids = [str(uuid.uuid4()) for _ in range(5)]
location_ids = [str(uuid.uuid4()) for _ in range(6)] # 5 tech + 1 matriz

sql.append(f"\n-- Estoque Matriz e 5 Depósitos de Técnicos")
sql.append(f"INSERT INTO storage_locations (id, company_id, nome, localizacao, ativo) VALUES ('{location_ids[0]}', '{company_id}', 'Estoque Matriz', 'Sede Principal', true);")
for i in range(5):
    sql.append(f"INSERT INTO users (id, company_id, name, email, role, ativo) VALUES ('{tech_ids[i]}', '{company_id}', '{tech_names[i]}', 'tech{i+1}@testtech.com', 'Técnico', true);")
    sql.append(f"INSERT INTO storage_locations (id, company_id, nome, localizacao, ativo) VALUES ('{location_ids[i+1]}', '{company_id}', 'Viatura {tech_names[i].split()[0]}', 'Veículo Operacional {i+1}', true);")

# 15 Suppliers
supplier_names = ["Distribuidora Norte", "Conectech Materiais", "Soluções Redes", "Fibra Brasil", "Eletron Araguaína", "Total Infra", "Mestre Conectores", "Prime Cabeamento", "Tech Solution", "Logistica Net", "Importadora Global", "Forte Hardware", "Vendas OS", "Parceiro Estoque", "Suprimentos TI"]
supplier_ids = [str(uuid.uuid4()) for _ in range(15)]

sql.append(f"\n-- 15 Fornecedores")
for i in range(15):
    name = supplier_names[i]
    corp = f"{name} Comércio e Indústria LTDA"
    doc = f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}/0001-{random.randint(10, 99)}"
    sql.append(f"INSERT INTO suppliers (id, company_id, name, corporate_name, document, email, phone, city, state, address, zip_code, neighborhood, number, status) VALUES ('{supplier_ids[i]}', '{company_id}', '{name}', '{corp}', '{doc}', 'contato@{name.lower().replace(' ', '')}.com', '63992{random.randint(100000, 999999)}', 'Araguaína', 'TO', 'Av Standard, {random.randint(10, 500)}', '77800-000', 'Setor Central', '{random.randint(1, 1000)}', 'ACTIVE');")

# 15 Products
product_names = [
    "Roteador Wi-Fi AC1200", "Conector RJ45 Shielded", "Cabo de Rede CAT6 305m", "Alicate Decapador", 
    "Switch 8 Portas Giga", "Patch Panel 24p", "Conversor de Mídia", "ONU Fibra GPON", 
    "Suporte Articulado", "Rack Estante 12U", "Fonte Nobreak 12V", "Cabo Drop 1km",
    "Esticador para Fibra", "Fita Isolante 20m", "Caneta Laser de Teste"
]
product_ids = [str(uuid.uuid4()) for _ in range(15)]

sql.append(f"\n-- 15 Produtos")
for i in range(15):
    buy = random.uniform(10.0, 200.0)
    margin = 40.0
    sell = buy * (1 + margin/100)
    sql.append(f"INSERT INTO products (id, company_id, nome, sku, preco_venda, valor_compra, margem_lucro, quantidade_estoque, categoria, ean, ncm, fornecedor_id, status) VALUES ('{product_ids[i]}', '{company_id}', '{product_names[i]}', 'SKU-{1000+i}', {sell:.2f}, {buy:.2f}, {margin}, {random.randint(5, 50)}, 'Material', '789{random.randint(1000000000, 9999999999)}', '85176277', '{supplier_ids[i]}', 'ACTIVE');")

# 15 Customers
customer_names = ["João Pereira", "Maria Silva", "Restaurante Central", "Academia Fit", "Mercado Araguaína", "Clínica Saúde", "Padaria Pão de Mel", "Escola Aprendiz", "Oficina São José", "Condomínio Solaris", "Loja de Roupas", "Consultório Dr. Pedro", "Pizzaria da Villa", "Posto Araguaia", "Sorveteria Sol"]
customer_ids = [str(uuid.uuid4()) for _ in range(15)]

sql.append(f"\n-- 15 Clientes")
for i in range(15):
    ctype = 'Pessoa Física' if i < 10 else 'Pessoa Jurídica'
    doc = f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.randint(10, 99)}" if i < 10 else f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}/0001-{random.randint(10, 99)}"
    sql.append(f"INSERT INTO customers (id, company_id, name, corporate_name, email, phone, city, estado, address, zip_code, neighborhood, number, customer_type, document, ativo) VALUES ('{customer_ids[i]}', '{company_id}', '{customer_names[i]}', '{customer_names[i]} Entretenimentos', 'cliente{i+1}@gmail.com', '63984{random.randint(100000, 999999)}', 'Araguaína', 'TO', 'Rua das Palmeiras, {random.randint(100, 2000)}', '77800-123', 'Bairro Nobre', '{random.randint(1, 5000)}', '{ctype}', '{doc}', true);")

# 15 Service Orders
statuses = ["Aberta"] * 5 + ["Em Andamento"] * 5 + ["Finalizada"] * 5
sql.append(f"\n-- 15 Ordens de Serviço")
for i in range(15):
    order_id = str(uuid.uuid4())
    customer_id = customer_ids[i]
    tech_id = tech_ids[i % 5]
    status = statuses[i]
    type_so = 'Instalação' if i % 2 == 0 else 'Manutenção'
    sql.append(f"INSERT INTO service_orders (id, company_id, customer_id, tech_id, status, type, description, scheduled_date, created_at, ativo) VALUES ('{order_id}', '{company_id}', '{customer_id}', '{tech_id}', '{status}', '{type_so}', 'Serviço de teste {i+1} para validação do sistema.', NOW(), NOW(), true);")

# 10 Mock Stock Movements
sql.append(f"\n-- 10 Movimentações de Estoque")
for i in range(10):
    m_id = str(uuid.uuid4())
    p_id = random.choice(product_ids)
    m_type = random.choice(['ENTRADA', 'TRANSFERENCIA'])
    qty = random.randint(1, 10)
    dest_id = random.choice(location_ids)
    orig_id = 'NULL' if m_type == 'ENTRADA' else f"'{random.choice(location_ids)}'"
    fornecedor_id = f"'{random.choice(supplier_ids)}'" if m_type == 'ENTRADA' else 'NULL'
    doc_ref = f"'NF-{random.randint(100, 999)}.{random.randint(100, 999)}'" if m_type == 'ENTRADA' else 'NULL'
    sql.append(f"INSERT INTO stock_movements (id, company_id, produto_id, tipo, quantidade, origem_id, destino_id, fornecedor_id, document_ref, user_name, created_at) VALUES ('{m_id}', '{company_id}', '{p_id}', '{m_type}', {qty}, {orig_id}, '{dest_id}', {fornecedor_id}, {doc_ref}, 'ADMIN TECH', NOW() - INTERVAL '{i} days');")

with open('c:\\Users\\jps\\Documents\\Sistema-OS\\seed.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql))
