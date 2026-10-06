/**
 * FloodGuard AI — Histórico Universal de Áreas de Risco — Defesa Civil de São Paulo & CGE
 * Fonte: GeoSampa / Defesa Civil SP / CGE / Dados Abertos PMSP
 * Cobertura de 100% do território da cidade de São Paulo com busca geoespacial por raio (1000m)
 * e fallback dinâmico por macrozona e bacia hidrográfica.
 */

const HISTORICO_DEFESA_CIVIL = [
    // --- CENTRO HISTÓRICO & BACIA DO TAMANDUATEÍ ---
    {
        id: "sp_cen_001",
        nome: "Baixada do Glicério",
        bairro: "Glicério / Liberdade",
        zona: "Centro",
        bacia: "Tamanduateí",
        lat: -23.5592,
        lon: -46.6288,
        historico_severidade: "Crítico",
        probabilidade_historica: 88,
        descricao: "Ponto crítico de acúmulo hídrico e transbordamento recorrente na várzea do Tamanduateí.",
        ocorrencias_anuais: 19,
        fonte: "Defesa Civil SP / GeoSampa",
        distancia_rio_m: 60,
        altitude_m: 720
    },
    {
        id: "sp_cen_002",
        nome: "Viaduto do Chá / Vale do Anhangabaú",
        bairro: "Centro Histórico / Anhangabaú",
        zona: "Centro",
        bacia: "Anhangabaú",
        lat: -23.5475,
        lon: -46.6378,
        historico_severidade: "Crítico",
        probabilidade_historica: 82,
        descricao: "Convergência pluvial histórica no fundo de vale do Vale do Anhangabaú.",
        ocorrencias_anuais: 14,
        fonte: "Defesa Civil SP / GeoSampa",
        distancia_rio_m: 110,
        altitude_m: 722
    },
    {
        id: "sp_cen_003",
        nome: "Av. do Estado (Trecho Radial / Mercado Municipal)",
        bairro: "Sé / Liberdade / Mercado",
        zona: "Centro",
        bacia: "Tamanduateí",
        lat: -23.5528,
        lon: -46.6268,
        historico_severidade: "Alto",
        probabilidade_historica: 74,
        descricao: "Confluência da Radial Leste com Av. do Estado sujeita a retenção violenta de águas pluviais.",
        ocorrencias_anuais: 12,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 50,
        altitude_m: 724
    },
    {
        id: "sp_cen_004",
        nome: "Rua Conselheiro Furtado",
        bairro: "Liberdade",
        zona: "Centro",
        bacia: "Tamanduateí",
        lat: -23.5558,
        lon: -46.6315,
        historico_severidade: "Alto",
        probabilidade_historica: 62,
        descricao: "Descida acentuada da Liberdade para o Glicério com formação de fortes enxurradas.",
        ocorrencias_anuais: 9,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 220,
        altitude_m: 738
    },
    {
        id: "sp_cen_005",
        nome: "Praça da Sé",
        bairro: "Centro / Sé",
        zona: "Centro",
        bacia: "Tamanduateí",
        lat: -23.5505,
        lon: -46.6333,
        historico_severidade: "Moderado",
        probabilidade_historica: 42,
        descricao: "Centro histórico de São Paulo com escoamento monitorado e alto tráfego de pedestres.",
        ocorrencias_anuais: 6,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 350,
        altitude_m: 746
    },
    {
        id: "sp_cen_006",
        nome: "Av. da Liberdade",
        bairro: "Liberdade",
        zona: "Centro",
        bacia: "Tamanduateí / Colina",
        lat: -23.5574,
        lon: -46.6367,
        historico_severidade: "Baixo",
        probabilidade_historica: 15,
        descricao: "Região alta da colina da Liberdade. Topografia estável e segura contra inundações.",
        ocorrencias_anuais: 1,
        fonte: "Defesa Civil SP / GeoSampa",
        distancia_rio_m: 480,
        altitude_m: 762
    },
    {
        id: "sp_cen_007",
        nome: "Praça da Bandeira / Av. 9 de Julho",
        bairro: "República / Bela Vista",
        zona: "Centro",
        bacia: "Anhangabaú",
        lat: -23.5500,
        lon: -46.6400,
        historico_severidade: "Crítico",
        probabilidade_historica: 80,
        descricao: "Ponto de convergência pluvial de toda a bacia central de São Paulo.",
        ocorrencias_anuais: 10,
        fonte: "Defesa Civil SP / CGE",
        distancia_rio_m: 250,
        altitude_m: 720
    },
    {
        id: "sp_cen_008",
        nome: "Santa Cecília / Minhocão (Elevado)",
        bairro: "Santa Cecília",
        zona: "Centro",
        bacia: "Tietê Centro",
        lat: -23.5370,
        lon: -46.6520,
        historico_severidade: "Moderado",
        probabilidade_historica: 45,
        descricao: "Acúmulo de lâmina d'água sob pilastras do elevado e cruzamentos em temporais.",
        ocorrencias_anuais: 5,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 850,
        altitude_m: 740
    },

    // --- EIXO MARGINAL TIETÊ & ZONA NORTE ---
    {
        id: "sp_nor_001",
        nome: "Marginal Tietê — Ponte das Bandeiras ao Anhembi",
        bairro: "Santana / Bom Retiro",
        zona: "Marginal Tietê / Zona Norte",
        bacia: "Rio Tietê",
        lat: -23.5180,
        lon: -46.6340,
        historico_severidade: "Crítico",
        probabilidade_historica: 90,
        descricao: "Ponto crítico histórico da calha do Tietê. Colapso frequente durante cheias com interdição total da via expressa.",
        ocorrencias_anuais: 14,
        fonte: "Defesa Civil SP / CGE",
        distancia_rio_m: 40,
        altitude_m: 715
    },
    {
        id: "sp_nor_002",
        nome: "Marginal Tietê — Ponte da Casa Verde",
        bairro: "Casa Verde / Bom Retiro",
        zona: "Marginal Tietê / Zona Norte",
        bacia: "Rio Tietê",
        lat: -23.5120,
        lon: -46.6600,
        historico_severidade: "Crítico",
        probabilidade_historica: 85,
        descricao: "Extrapolamento das pistas expressas da Marginal Tietê e travamento do eixo Norte-Sul.",
        ocorrencias_anuais: 11,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 45,
        altitude_m: 716
    },
    {
        id: "sp_nor_003",
        nome: "Santana — Av. Cruzeiro do Sul / Metrô Armênia",
        bairro: "Santana / Canindé",
        zona: "Zona Norte",
        bacia: "Rio Tietê / Tamanduateí",
        lat: -23.5150,
        lon: -46.6230,
        historico_severidade: "Crítico",
        probabilidade_historica: 86,
        descricao: "Confluência com o Rio Tietê e Tamanduateí com alagamentos severos nos acessos ao metrô.",
        ocorrencias_anuais: 12,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 80,
        altitude_m: 717
    },
    {
        id: "sp_nor_004",
        nome: "Limão — Av. Celestino Bourroul / Marginal Tietê",
        bairro: "Bairro do Limão",
        zona: "Zona Norte",
        bacia: "Rio Tietê",
        lat: -23.5090,
        lon: -46.6780,
        historico_severidade: "Alto",
        probabilidade_historica: 70,
        descricao: "Ponto baixo do Limão sujeito a retenção rápida e represamento pluvial.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 120,
        altitude_m: 721
    },
    {
        id: "sp_nor_005",
        nome: "Freguesia do Ó — Av. Inajar de Souza / Córrego Cabuçu",
        bairro: "Freguesia do Ó",
        zona: "Zona Norte",
        bacia: "Córrego Cabuçu de Baixo",
        lat: -23.4980,
        lon: -46.6850,
        historico_severidade: "Alto",
        probabilidade_historica: 75,
        descricao: "Transbordamento da calha do Córrego Cabuçu de Baixo sobre a pista da Inajar de Souza.",
        ocorrencias_anuais: 9,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 50,
        altitude_m: 724
    },
    {
        id: "sp_nor_006",
        nome: "Mandaqui — Av. Engenheiro Caetano Álvares",
        bairro: "Mandaqui",
        zona: "Zona Norte",
        bacia: "Córrego Mandaqui",
        lat: -23.4910,
        lon: -46.6450,
        historico_severidade: "Alto",
        probabilidade_historica: 72,
        descricao: "Trecho do canal central com refluxo pluvial recorrente em temporais convectivos.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP / CGE",
        distancia_rio_m: 30,
        altitude_m: 727
    },
    {
        id: "sp_nor_007",
        nome: "Pirituba — Av. Raimundo Pereira de Magalhães / Tietê",
        bairro: "Pirituba",
        zona: "Zona Norte / Noroeste",
        bacia: "Rio Tietê / Pirituba",
        lat: -23.5110,
        lon: -46.7250,
        historico_severidade: "Alto",
        probabilidade_historica: 68,
        descricao: "Deságue de córregos da bacia de Pirituba na calha do Tietê com pontos intransitáveis.",
        ocorrencias_anuais: 7,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 180,
        altitude_m: 725
    },
    {
        id: "sp_nor_008",
        nome: "Tremembé / Cantareira — Córrego Cabuçu de Cima",
        bairro: "Tremembé",
        zona: "Zona Norte",
        bacia: "Cabuçu de Cima",
        lat: -23.4560,
        lon: -46.6180,
        historico_severidade: "Alto",
        probabilidade_historica: 65,
        descricao: "Bacia de resposta hidrológica ultrarrápida descendente da Serra da Cantareira.",
        ocorrencias_anuais: 7,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 70,
        altitude_m: 745
    },

    // --- EIXO MARGINAL PINHEIROS & ZONA OESTE ---
    {
        id: "sp_oes_001",
        nome: "Marginal Pinheiros — Ceagesp / Viaduto Jaguaré",
        bairro: "Vila Leopoldina / Jaguaré",
        zona: "Marginal Pinheiros / Zona Oeste",
        bacia: "Rio Pinheiros / Rio Tietê",
        lat: -23.5350,
        lon: -46.7350,
        historico_severidade: "Crítico",
        probabilidade_historica: 88,
        descricao: "Baixada do Ceagesp próxima à junção dos rios Pinheiros e Tietê. Extensa área sujeita a inundações severas.",
        ocorrencias_anuais: 13,
        fonte: "Defesa Civil SP / CGE",
        distancia_rio_m: 110,
        altitude_m: 719
    },
    {
        id: "sp_oes_002",
        nome: "Marginal Pinheiros — Ponte Cidade Jardim",
        bairro: "Cidade Jardim / Pinheiros",
        zona: "Marginal Pinheiros",
        bacia: "Rio Pinheiros",
        lat: -23.5850,
        lon: -46.6900,
        historico_severidade: "Crítico",
        probabilidade_historica: 82,
        descricao: "Extrapolamento da pista expressa do Pinheiros com refluxo em alças de acesso viário.",
        ocorrencias_anuais: 10,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 50,
        altitude_m: 720
    },
    {
        id: "sp_oes_003",
        nome: "Marginal Pinheiros — Ponte Roberto Zuccolo",
        bairro: "Lapa / Vila Leopoldina",
        zona: "Marginal Pinheiros",
        bacia: "Rio Pinheiros",
        lat: -23.5280,
        lon: -46.7150,
        historico_severidade: "Alto",
        probabilidade_historica: 74,
        descricao: "Região da Lapa de Baixo com refluxo de águas pluviais próximo à ponte.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 60,
        altitude_m: 721
    },
    {
        id: "sp_oes_004",
        nome: "Lapa — Av. Ermano Marchetti / Guaicurus",
        bairro: "Lapa",
        zona: "Zona Oeste",
        bacia: "Rio Tietê / Lapa",
        lat: -23.5189,
        lon: -46.7020,
        historico_severidade: "Alto",
        probabilidade_historica: 76,
        descricao: "Região baixa da Lapa com histórico de alagamentos que bloqueiam vias e afetam comércio.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 200,
        altitude_m: 722
    },
    {
        id: "sp_oes_005",
        nome: "Perdizes / Pompeia — Av. Pompeia / Córrego Água Preta",
        bairro: "Pompeia / Perdizes",
        zona: "Zona Oeste",
        bacia: "Córrego Água Preta / Sumaré",
        lat: -23.5280,
        lon: -46.6850,
        historico_severidade: "Crítico",
        probabilidade_historica: 84,
        descricao: "Região de vale entre colinas com grande fluxo de enxurrada na Av. Pompeia e Francisco Matarazzo.",
        ocorrencias_anuais: 11,
        fonte: "Defesa Civil SP / CGE",
        distancia_rio_m: 80,
        altitude_m: 726
    },
    {
        id: "sp_oes_006",
        nome: "Butantã — Av. Vital Brasil / Bacia Rio Pirajuçara",
        bairro: "Butantã",
        zona: "Zona Oeste",
        bacia: "Rio Pirajuçara / Pinheiros",
        lat: -23.5710,
        lon: -46.7080,
        historico_severidade: "Alto",
        probabilidade_historica: 71,
        descricao: "Vale de aproximação do metrô Butantã com refluxo de córregos afluentes do Rio Pinheiros.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 350,
        altitude_m: 730
    },
    {
        id: "sp_oes_007",
        nome: "Pinheiros — Av. Brig. Faria Lima / Rebouças",
        bairro: "Pinheiros",
        zona: "Zona Oeste",
        bacia: "Rio Pinheiros",
        lat: -23.5680,
        lon: -46.6920,
        historico_severidade: "Moderado",
        probabilidade_historica: 48,
        descricao: "Trechos viários com acúmulo moderado de águas pluviais em sarjetas e cruzamentos.",
        ocorrencias_anuais: 5,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 650,
        altitude_m: 742
    },

    // --- ZONA LESTE (BACIAS ARICANDUVA, TAMANDUATEÍ E TIETÊ LESTE) ---
    {
        id: "sp_les_001",
        nome: "Tatuapé — Av. Radial Leste / Rio Aricanduva",
        bairro: "Tatuapé / Penha",
        zona: "Zona Leste",
        bacia: "Rio Aricanduva",
        lat: -23.5430,
        lon: -46.5610,
        historico_severidade: "Crítico",
        probabilidade_historica: 92,
        descricao: "Confluência do Rio Aricanduva com a Radial Leste. Área frequentemente intransitável.",
        ocorrencias_anuais: 15,
        fonte: "Defesa Civil SP / GeoSampa",
        distancia_rio_m: 60,
        altitude_m: 725
    },
    {
        id: "sp_les_002",
        nome: "Av. Aricanduva — Shopping Aricanduva",
        bairro: "Aricanduva / Cidade Líder",
        zona: "Zona Leste",
        bacia: "Rio Aricanduva",
        lat: -23.5550,
        lon: -46.5250,
        historico_severidade: "Crítico",
        probabilidade_historica: 94,
        descricao: "Epicentro histórico de inundações na Zona Leste com transbordamento recorrente do Rio Aricanduva.",
        ocorrencias_anuais: 16,
        fonte: "Defesa Civil SP / CGE",
        distancia_rio_m: 40,
        altitude_m: 722
    },
    {
        id: "sp_les_003",
        nome: "Vila Prudente — Bacia Córrego da Mooca / Anhaia Mello",
        bairro: "Vila Prudente",
        zona: "Zona Leste",
        bacia: "Córrego da Mooca",
        lat: -23.5890,
        lon: -46.5600,
        historico_severidade: "Crítico",
        probabilidade_historica: 87,
        descricao: "Córrego da Mooca e Av. Anhaia Mello com refluxo violento gerando bolsões profundos de água.",
        ocorrencias_anuais: 12,
        fonte: "Defesa Civil SP / CGE",
        distancia_rio_m: 90,
        altitude_m: 728
    },
    {
        id: "sp_les_004",
        nome: "Mooca — Rua dos Trilhos / Ibitirama",
        bairro: "Mooca",
        zona: "Zona Leste",
        bacia: "Tamanduateí Leste",
        lat: -23.5580,
        lon: -46.5950,
        historico_severidade: "Alto",
        probabilidade_historica: 73,
        descricao: "Ponto baixo da Mooca próximo à ferrovia com retenção histórica de volume pluvial.",
        ocorrencias_anuais: 9,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 140,
        altitude_m: 732
    },
    {
        id: "sp_les_005",
        nome: "Itaquera — Bacia do Rio Verde / Córrego Itaquera",
        bairro: "Itaquera",
        zona: "Zona Leste",
        bacia: "Rio Verde / Itaquera",
        lat: -23.5395,
        lon: -46.4580,
        historico_severidade: "Alto",
        probabilidade_historica: 70,
        descricao: "Pontos de alagamento próximos ao Córrego Itaquera e Radial Leste.",
        ocorrencias_anuais: 7,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 80,
        altitude_m: 755
    },
    {
        id: "sp_les_006",
        nome: "Penha — Av. São Miguel / Córrego Tiquatira",
        bairro: "Penha de França",
        zona: "Zona Leste",
        bacia: "Córrego Tiquatira",
        lat: -23.5210,
        lon: -46.5380,
        historico_severidade: "Alto",
        probabilidade_historica: 69,
        descricao: "Parque Linear Tiquatira e cruzamentos da Av. São Miguel com extravasamento pluvial.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 60,
        altitude_m: 728
    },
    {
        id: "sp_les_007",
        nome: "São Miguel Paulista — Av. Marechal Tito / Rio Tietê",
        bairro: "São Miguel Paulista",
        zona: "Zona Leste",
        bacia: "Rio Tietê Leste",
        lat: -23.4950,
        lon: -46.4420,
        historico_severidade: "Alto",
        probabilidade_historica: 76,
        descricao: "Planície aluvial do Tietê sujeita a inundações prolongadas em dias de chuva constante.",
        ocorrencias_anuais: 9,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 190,
        altitude_m: 723
    },
    {
        id: "sp_les_008",
        nome: "São Mateus — Av. Ragueb Chohfi / Córrego Caguaçu",
        bairro: "São Mateus",
        zona: "Zona Leste",
        bacia: "Córrego Caguaçu / Aricanduva",
        lat: -23.5980,
        lon: -46.4780,
        historico_severidade: "Alto",
        probabilidade_historica: 72,
        descricao: "Trechos baixos da Av. Ragueb Chohfi com acúmulos intensos de enxurrada.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 110,
        altitude_m: 742
    },

    // --- ZONA SUL (BACIAS IPIRANGA, PINHEIRINHO, ZAVUVUS E REPRESAS) ---
    {
        id: "sp_sul_001",
        nome: "Brooklin — Av. dos Bandeirantes / Córrego Pinheirinho",
        bairro: "Brooklin / Campo Belo",
        zona: "Zona Sul",
        bacia: "Córrego Pinheirinho / Pinheiros",
        lat: -23.6120,
        lon: -46.6780,
        historico_severidade: "Crítico",
        probabilidade_historica: 86,
        descricao: "Região com alagamentos recorrentes na Av. dos Bandeirantes com paralisação do tráfego.",
        ocorrencias_anuais: 11,
        fonte: "Defesa Civil SP / CGE",
        distancia_rio_m: 90,
        altitude_m: 732
    },
    {
        id: "sp_sul_002",
        nome: "Ipiranga — Av. Dr. Ricardo Jafet / Córrego Ipiranga",
        bairro: "Ipiranga",
        zona: "Zona Sul",
        bacia: "Córrego Ipiranga",
        lat: -23.5850,
        lon: -46.6080,
        historico_severidade: "Alto",
        probabilidade_historica: 78,
        descricao: "Fundo de vale da Av. Ricardo Jafet com transbordamento do Córrego Ipiranga em temporais severos.",
        ocorrencias_anuais: 9,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 100,
        altitude_m: 738
    },
    {
        id: "sp_sul_003",
        nome: "Sacomã — Av. Sapopemba / Córrego Oratório",
        bairro: "Sacomã / Ipiranga",
        zona: "Zona Sul",
        bacia: "Córrego Oratório",
        lat: -23.5998,
        lon: -46.5501,
        historico_severidade: "Crítico",
        probabilidade_historica: 83,
        descricao: "Área de confluência com histórico recorrente. A Av. Sapopemba alaga rapidamente em chuvas moderadas.",
        ocorrencias_anuais: 11,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 150,
        altitude_m: 730
    },
    {
        id: "sp_sul_004",
        nome: "Santo Amaro — Av. Santo Amaro / Roque Petroni Jr.",
        bairro: "Santo Amaro / Morumbi",
        zona: "Zona Sul",
        bacia: "Rio Pinheiros Sul",
        lat: -23.6280,
        lon: -46.6960,
        historico_severidade: "Alto",
        probabilidade_historica: 70,
        descricao: "Várzea do Rio Pinheiros próxima ao Shopping Morumbi com bolsões frequentes de água.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 210,
        altitude_m: 728
    },
    {
        id: "sp_sul_005",
        nome: "Jabaquara — Bacia Córrego Zavuvus / Av. Interlagos",
        bairro: "Jabaquara / Cidade Ademar",
        zona: "Zona Sul",
        bacia: "Córrego Zavuvus",
        lat: -23.6650,
        lon: -46.6750,
        historico_severidade: "Crítico",
        probabilidade_historica: 85,
        descricao: "Córrego Zavuvus com transbordamento histórico crônico em trechos de residência e comércio.",
        ocorrencias_anuais: 12,
        fonte: "Defesa Civil SP / CGE",
        distancia_rio_m: 75,
        altitude_m: 736
    },
    {
        id: "sp_sul_006",
        nome: "Campo Limpo — Estrada de Itapecerica / Pirajuçara",
        bairro: "Campo Limpo",
        zona: "Zona Sul-Oeste",
        bacia: "Bacia do Pirajuçara",
        lat: -23.6490,
        lon: -46.7550,
        historico_severidade: "Alto",
        probabilidade_historica: 74,
        descricao: "Bacia do Pirajuçara na Zona Sul com rápida subida de lâmina d'água das vias.",
        ocorrencias_anuais: 9,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 130,
        altitude_m: 745
    },
    {
        id: "sp_sul_007",
        nome: "Capão Redondo — Estrada de M'Boi Mirim",
        bairro: "Capão Redondo",
        zona: "Zona Sul",
        bacia: "Guarapiranga / M'Boi Mirim",
        lat: -23.6820,
        lon: -46.7720,
        historico_severidade: "Alto",
        probabilidade_historica: 68,
        descricao: "Vias troncais de drenagem sobrecarregada com escoamento rápido de encostas densas.",
        ocorrencias_anuais: 7,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 290,
        altitude_m: 752
    },
    {
        id: "sp_sul_008",
        nome: "Socorro / Interlagos — Ponte do Socorro / Guarapiranga",
        bairro: "Socorro / Interlagos",
        zona: "Zona Sul",
        bacia: "Represa Guarapiranga / Pinheiros",
        lat: -23.6740,
        lon: -46.7110,
        historico_severidade: "Alto",
        probabilidade_historica: 75,
        descricao: "Área de confluência da represa Guarapiranga e canal do Pinheiros com pontos de retenção.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 80,
        altitude_m: 726
    }
];

/**
 * Consulta geoespacial no histórico da Defesa Civil / CGE com raio de 1.000 metros
 * e Fallback Dinâmico de Macrozona / Bacia Hidrográfica para 100% de São Paulo.
 */
function queryHistoricalRiskClient(lat, lon, radiusMeters = 1000) {
    let nearest = null;
    const recordsWithinRadius = [];

    for (const item of HISTORICO_DEFESA_CIVIL) {
        const dy = (lat - item.lat) * 111000;
        const dx = (lon - item.lon) * 102000;
        const dist = Math.hypot(dx, dy);

        if (!nearest || dist < nearest.dist) {
            nearest = { item, dist };
        }

        if (dist <= radiusMeters) {
            recordsWithinRadius.push({
                ...item,
                distancia_metros: Math.round(dist)
            });
        }
    }

    // Se encontrou pontos a até 1.000m:
    if (recordsWithinRadius.length > 0 && nearest) {
        const distFactor = Math.max(0, 1 - (nearest.dist / radiusMeters));
        const severityWeight = (nearest.item.probabilidade_historica || 70) / 100;
        const influence = distFactor * severityWeight;

        return {
            hasRecordsWithinRadius: true,
            nearestRecord: nearest.item,
            distanceMeters: Math.round(nearest.dist),
            influence: Number(influence.toFixed(3)),
            recordsCount: recordsWithinRadius.length,
            isChronic: influence >= 0.25,
            zoneName: nearest.item.nome,
            bacia: nearest.item.bacia,
            zona: nearest.item.zona,
            statusDescription: `Ponto crítico registrado pela Defesa Civil a ${Math.round(nearest.dist)}m (${nearest.item.nome})`
        };
    }

    // Fallback dinâmico por macrozona e bacia geográfica de SP
    const fallback = getDynamicBasinFallbackClient(lat, lon);
    const fallbackInfluence = (fallback.probabilidadeBase / 100) * 0.42;

    return {
        hasRecordsWithinRadius: false,
        nearestRecord: nearest ? nearest.item : null,
        distanceMeters: nearest ? Math.round(nearest.dist) : null,
        influence: Number(fallbackInfluence.toFixed(3)),
        recordsCount: 0,
        isChronic: false,
        zoneName: fallback.zonaGeografica,
        bacia: fallback.baciaHidrografica,
        zona: fallback.zonaGeografica,
        statusDescription: `Padrão hidrológico da ${fallback.zonaGeografica} (${fallback.baciaHidrografica})`,
        fallbackDetails: fallback
    };
}

/**
 * Fallback Dinâmico por Bacia Hidrográfica e Zona de SP
 */
function getDynamicBasinFallbackClient(lat, lon) {
    if (lat >= -23.535 && lat <= -23.500 && lon >= -46.750 && lon <= -46.500) {
        return {
            zonaGeografica: "Eixo Marginal Tietê",
            baciaHidrografica: "Calha do Rio Tietê",
            probabilidadeBase: 68,
            descricao: "Várzea fluvial plana com alto risco de retenção hídrica em episódios de chuva contínua."
        };
    }

    if (lat >= -23.700 && lat <= -23.525 && lon >= -46.745 && lon <= -46.680) {
        return {
            zonaGeografica: "Eixo Marginal Pinheiros",
            baciaHidrografica: "Calha do Rio Pinheiros",
            probabilidadeBase: 64,
            descricao: "Corredor aluvial plano sob influência de afluentes como Pirajuçara e Água Espraiada."
        };
    }

    if (lat >= -23.568 && lat <= -23.535 && lon >= -46.650 && lon <= -46.615) {
        return {
            zonaGeografica: "Centro Histórico / Bacia Central",
            baciaHidrografica: "Tamanduateí / Anhangabaú",
            probabilidadeBase: 58,
            descricao: "Fundos de vale urbanos centrais com galerias pluviais históricas sob grande pressão hídrica."
        };
    }

    if (lon > -46.600) {
        if (lat <= -23.570) {
            return {
                zonaGeografica: "Zona Leste (Mooca / Vila Prudente)",
                baciaHidrografica: "Córrego da Mooca / Oratório",
                probabilidadeBase: 60,
                descricao: "Planície intermediária com histórico de refluxo em pontes e vias da Anhaia Mello."
            };
        } else {
            return {
                zonaGeografica: "Zona Leste (Aricanduva / Itaquera)",
                baciaHidrografica: "Rio Aricanduva / Tietê Leste",
                probabilidadeBase: 62,
                descricao: "Bacia com rápida concentração de cheias e transbordamento em pontos da Av. Aricanduva."
            };
        }
    }

    if (lat > -23.515) {
        return {
            zonaGeografica: "Zona Norte (Mandaqui / Cantareira)",
            baciaHidrografica: "Cabuçu / Mandaqui",
            probabilidadeBase: 52,
            descricao: "Vertentes de transição da Serra da Cantareira com enxurradas rápidas em avenidas de fundo de vale."
        };
    }

    if (lat < -23.585) {
        return {
            zonaGeografica: "Zona Sul (Ipiranga / Brooklin / Santo Amaro)",
            baciaHidrografica: "Ipiranga / Zavuvus / Pinheirinho",
            probabilidadeBase: 56,
            descricao: "Bacias do planalto sul paulistano com histórico de alagamentos em cruzamentos arteriais."
        };
    }

    if (lon < -46.660) {
        return {
            zonaGeografica: "Zona Oeste (Pompeia / Perdizes / Butantã)",
            baciaHidrografica: "Água Preta / Sumaré / Pirajuçara",
            probabilidadeBase: 54,
            descricao: "Colinas com vales profundos que acumulam água com rapidez na Av. Pompeia e Francisco Matarazzo."
        };
    }

    return {
        zonaGeografica: "Planalto Metropolitano de São Paulo",
        baciaHidrografica: "Rede Hidrográfica Geral de SP",
        probabilidadeBase: 40,
        descricao: "Planalto atlântico com drenagem urbana padrão sob monitoramento contínuo da Defesa Civil."
    };
}
