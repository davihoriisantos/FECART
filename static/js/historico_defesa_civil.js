/**
 * FloodGuard AI — Histórico de Áreas de Risco — Defesa Civil de São Paulo
 * Fonte: GeoSampa / Defesa Civil SP / Dados Abertos PMSP
 * Inclui trechos com histórico grave de enchentes e alagamentos recorrentes.
 */
const HISTORICO_DEFESA_CIVIL = [
    {
        id: "dc_001",
        nome: "Av. do Estado — Trecho Glicério / Cambuci",
        bairro: "Cambuci / Glicério",
        lat: -23.5631,
        lon: -46.6326,
        historico_severidade: "Crítico",
        descricao: "Área com histórico crítico de alagamento grave. Trecho da Av. do Estado próximo ao Rio Tamanduateí historicamente atinge 1,5m de lâmina d'água.",
        ocorrencias_anuais: 18,
        fonte: "Defesa Civil SP / GeoSampa",
        distancia_rio_m: 50,
        altitude_m: 721
    },
    {
        id: "dc_002",
        nome: "Mooca — Baixada do Rio Tamanduateí",
        bairro: "Mooca",
        lat: -23.5590,
        lon: -46.5950,
        historico_severidade: "Crítico",
        descricao: "Região com histórico recorrente de inundações severas. O Rio Tamanduateí transborda com frequência, afetando residências e comércio.",
        ocorrencias_anuais: 15,
        fonte: "Defesa Civil SP / GeoSampa",
        distancia_rio_m: 120,
        altitude_m: 724
    },
    {
        id: "dc_003",
        nome: "Av. Anhaia Mello — Ipiranga / Vila Prudente",
        bairro: "Vila Prudente / Ipiranga",
        lat: -23.5820,
        lon: -46.5740,
        historico_severidade: "Alto",
        descricao: "Via com acúmulo de água recorrente. Galeria pluvial subdimensionada causa alagamentos a cada chuva acima de 30mm.",
        ocorrencias_anuais: 10,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 350,
        altitude_m: 735
    },
    {
        id: "dc_004",
        nome: "Marginal Pinheiros — Trecho Ponte das Bandeiras",
        bairro: "Pinheiros",
        lat: -23.5409,
        lon: -46.6876,
        historico_severidade: "Crítico",
        descricao: "Área historicamente crítica. O Rio Pinheiros já transbordou repetidamente cobrindo completamente a via expressa.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP / GeoSampa",
        distancia_rio_m: 30,
        altitude_m: 718
    },
    {
        id: "dc_005",
        nome: "Marginal Tietê — Ponte das Bandeiras ao Anhangabaú",
        bairro: "Centro / Santana",
        lat: -23.5238,
        lon: -46.6360,
        historico_severidade: "Crítico",
        descricao: "Ponto crítico histórico da Marginal Tietê. Colapso frequente durante enchentes de grande magnitude com interdição total da via.",
        ocorrencias_anuais: 12,
        fonte: "Defesa Civil SP / GeoSampa",
        distancia_rio_m: 40,
        altitude_m: 715
    },
    {
        id: "dc_006",
        nome: "Vila Prudente — Córrego Traição",
        bairro: "Vila Prudente",
        lat: -23.5890,
        lon: -46.5600,
        historico_severidade: "Alto",
        descricao: "Córrego do Traição historicamente causa alagamentos de vias e residências. Canal aberto com capacidade insuficiente.",
        ocorrencias_anuais: 9,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 100,
        altitude_m: 728
    },
    {
        id: "dc_007",
        nome: "Lapa — Rio Tietê / Av. Ermano Marchetti",
        bairro: "Lapa",
        lat: -23.5189,
        lon: -46.7020,
        historico_severidade: "Alto",
        descricao: "Região baixa da Lapa com histórico de alagamentos que bloqueiam vias e afetam comércio. Influência direta do nível do Rio Tietê.",
        ocorrencias_anuais: 7,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 200,
        altitude_m: 722
    },
    {
        id: "dc_008",
        nome: "Sacomã — Av. Sapopemba / Córrego Aricanduva",
        bairro: "Sacomã",
        lat: -23.5998,
        lon: -46.5501,
        historico_severidade: "Alto",
        descricao: "Área de confluência de córregos com histórico recorrente. A Av. Sapopemba alaga com chuvas moderadas.",
        ocorrencias_anuais: 11,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 150,
        altitude_m: 730
    },
    {
        id: "dc_009",
        nome: "Itaquera — Córrego Itaquera",
        bairro: "Itaquera",
        lat: -23.5395,
        lon: -46.4580,
        historico_severidade: "Moderado",
        descricao: "Pontos de alagamento identificados próximos ao Córrego Itaquera, com histórico de médio impacto em chuvas intensas.",
        ocorrencias_anuais: 5,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 80,
        altitude_m: 755
    },
    {
        id: "dc_010",
        nome: "Tatuapé — Av. Radial Leste / Rio Aricanduva",
        bairro: "Tatuapé",
        lat: -23.5430,
        lon: -46.5610,
        historico_severidade: "Crítico",
        descricao: "Confluência do Rio Aricanduva com a Radial Leste. Área recorrentemente inundada com histórico de interrupção total do tráfego.",
        ocorrencias_anuais: 14,
        fonte: "Defesa Civil SP / GeoSampa",
        distancia_rio_m: 60,
        altitude_m: 725
    },
    {
        id: "dc_011",
        nome: "Brooklin — Av. dos Bandeirantes / Córrego Pinheirinho",
        bairro: "Brooklin",
        lat: -23.6120,
        lon: -46.6780,
        historico_severidade: "Alto",
        descricao: "Região com alagamentos recorrentes na Av. dos Bandeirantes. Córrego Pinheirinho canalizado insuficiente.",
        ocorrencias_anuais: 8,
        fonte: "Defesa Civil SP",
        distancia_rio_m: 90,
        altitude_m: 732
    },
    {
        id: "dc_012",
        nome: "Santo André — Trecho Capuava / Tancredo Neves",
        bairro: "Santo André (RMSP)",
        lat: -23.6500,
        lon: -46.5320,
        historico_severidade: "Alto",
        descricao: "Área metropolitana com histórico grave de enchentes oriundas do Rio Tamanduateí e afluentes.",
        ocorrencias_anuais: 9,
        fonte: "Defesa Civil Santo André",
        distancia_rio_m: 110,
        altitude_m: 740
    }
];
