/**
 * plan.js — plano semanal fixo.
 * Editar aqui se a rotina mudar. Os ids sao usados como chave dos registros,
 * entao evite renomear ids ja usados (o historico ficaria orfao).
 *
 * dow: 0=Domingo, 1=Segunda ... 6=Sabado (igual a Date#getDay)
 */

const ex = (id, name, sets) => ({ id, name, sets });

export const PUSH = [
  ex('supino_reto',            'Supino reto',                  '4 x 6-8'),
  ex('supino_incl_halteres',   'Supino inclinado com halteres','3 x 8-10'),
  ex('desenvolvimento',        'Desenvolvimento',              '3 x 6-10'),
  ex('elevacao_lateral',       'Elevacao lateral',             '4 x 12-15'),
  ex('crossover',              'Crossover',                    '3 x 10-15'),
  ex('triceps_testa',          'Triceps testa',                '3 x 8-12'),
  ex('triceps_corda',          'Triceps corda',                '2 x 10-15'),
];

export const PULL = [
  ex('barra_ou_puxada',   'Barra fixa ou puxada', '4 x 6-10'),
  ex('remada_maquina',    'Remada maquina',       '3 x 8-10'),
  ex('remada_unilateral', 'Remada unilateral',    '3 x 10-12'),
  ex('pulldown',          'Pulldown',             '2 x 10-15'),
  ex('face_pull',         'Face pull',            '3 x 12-15'),
  ex('rosca_direta',      'Rosca direta',         '3 x 8-12'),
  ex('rosca_martelo',     'Rosca martelo',        '2 x 10-12'),
];

export const LEGS = [
  ex('agachamento_hack',    'Agachamento ou Hack', '4 x 6-8'),
  ex('leg_press',           'Leg press',           '3 x 8-12'),
  ex('stiff_rdl',           'Stiff / RDL',         '3 x 8-10'),
  ex('mesa_flexora',        'Mesa flexora',        '3 x 10-12'),
  ex('extensora',           'Extensora',           '2 x 12-15'),
  ex('panturrilha_pe',      'Panturrilha em pe',   '3 x 10-15'),
  ex('panturrilha_sentado', 'Panturrilha sentado', '2 x 12-15'),
  ex('abdomen',             'Abdomen',             '3 series'),
];

export const UPPER = [
  ex('supino_inclinado',      'Supino inclinado',        '3 x 8-10'),
  ex('desenvolvimento_maq',   'Desenvolvimento maquina', '3 x 8-12'),
  ex('elevacao_lateral',      'Elevacao lateral',        '4 x 12-20'),
  ex('crucifixo_crossover',   'Crucifixo / crossover',   '2 x 12-15'),
  ex('triceps_corda',         'Triceps corda',           '3 x 10-15'),
  ex('rosca_direta',          'Rosca direta',            '3 x 8-12'),
  ex('rosca_martelo',         'Rosca martelo',           '2 x 10-12'),
];

export const BACK_POST = [
  ex('puxada_alta',        'Puxada alta',        '3 x 8-12'),
  ex('remada_baixa',       'Remada baixa',       '3 x 8-12'),
  ex('remada_unilateral',  'Remada unilateral',  '2 x 10-12'),
  ex('elevacao_posterior', 'Elevacao posterior', '3 x 12-15'),
  ex('stiff_leve',         'Stiff leve',         '2 x 10-12'),
  ex('mesa_flexora',       'Mesa flexora',       '2 x 10-15'),
  ex('panturrilha',        'Panturrilha',        '3 x 12-15'),
  ex('abdomen',            'Abdomen',            '3 series'),
];

/** kind: strength | run | swim  (usado para cor, icone e formulario) */
export const PLAN = {
  1: [
    { id:'push', kind:'strength', emoji:'\u{1F3CB}\u{FE0F}', title:'Push',
      subtitle:'Peito + Ombros + Triceps', tag:'Musculacao', exercises:PUSH },
  ],
  2: [
    { id:'corrida_leve', kind:'run', emoji:'\u{1F3C3}', title:'Corrida leve',
      subtitle:'Ritmo confortavel', tag:'Corrida' },
    { id:'pull', kind:'strength', emoji:'\u{1F3CB}\u{FE0F}', title:'Pull',
      subtitle:'Costas + Biceps', tag:'Musculacao', exercises:PULL },
  ],
  3: [
    { id:'natacao_leve', kind:'swim', emoji:'\u{1F3CA}', title:'Natacao leve',
      subtitle:'Tecnica e recuperacao', tag:'Natacao' },
    { id:'legs', kind:'strength', emoji:'\u{1F3CB}\u{FE0F}', title:'Legs',
      subtitle:'Pernas completo', tag:'Musculacao', exercises:LEGS },
  ],
  4: [
    { id:'corrida_tiros', kind:'run', emoji:'\u{1F3C3}', title:'Corrida de tiros',
      subtitle:'Intervalado', tag:'Corrida' },
    { id:'upper', kind:'strength', emoji:'\u{1F3CB}\u{FE0F}', title:'Upper estetico',
      subtitle:'Ombros + Peito + Bracos', tag:'Musculacao', exercises:UPPER },
  ],
  5: [
    { id:'natacao_leve', kind:'swim', emoji:'\u{1F3CA}', title:'Natacao leve',
      subtitle:'Tecnica e recuperacao', tag:'Natacao' },
    { id:'costas_posterior', kind:'strength', emoji:'\u{1F3CB}\u{FE0F}', title:'Costas + Posterior',
      subtitle:'Puxada + Cadeia posterior', tag:'Musculacao', exercises:BACK_POST },
  ],
  6: [], // sabado — descanso
  0: [
    { id:'longao', kind:'run', emoji:'\u{1F3C3}', title:'Longao',
      subtitle:'Volume da semana', tag:'Corrida', variantable:true },
  ],
};

/** Variantes do treino de domingo */
export const VARIANTS = {
  longao: { title:'Longao', emoji:'\u{1F3C3}', subtitle:'Volume da semana', kind:'run' },
  prova:  { title:'Prova',  emoji:'\u{1F3C1}', subtitle:'Dia de competicao', kind:'race' },
};

export const RIR_TEXT =
  'RIR = quantas repeticoes voce ainda conseguiria fazer antes da falha.';
export const RIR_RANGE = '1-3';

/** Retorna os treinos planejados de uma data (Date), ja aplicando variante. */
export function planFor(date, variantOf) {
  const list = PLAN[date.getDay()] || [];
  return list.map((w) => {
    if (!w.variantable) return w;
    const v = variantOf && variantOf(w.id);
    if (v && VARIANTS[v] && v !== 'longao') {
      return { ...w, ...VARIANTS[v], variant:v };
    }
    return { ...w, variant:'longao' };
  });
}

/** Mapa id -> exercicio, para lookups de historico de carga. */
export const EXERCISE_INDEX = (() => {
  const map = {};
  Object.values(PLAN).flat().forEach((w) => {
    (w.exercises || []).forEach((e) => { map[e.id] = e; });
  });
  return map;
})();
