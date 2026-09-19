const breaks = [
  {
    icon: '🚲',
    title: 'Намалюй велосипед за 30 секунд',
    text: 'Два кола. З’єднай їх трикутником. Додай кермо, сидіння й дві короткі лінії до педалей.',
    challenge: 'Тепер відклади підказку й намалюй його ще раз по пам’яті.',
  },
  {
    icon: '🧠',
    title: 'Мозок любить дивні зв’язки',
    text: 'Щоб запам’ятати три непов’язані слова, придумай одну смішну картинку, де всі три зустрічаються.',
    challenge: 'Спробуй зі словами: ракета · банан · окуляри.',
  },
  {
    icon: '👀',
    title: '20 секунд для очей',
    text: 'Подивись на найдальший предмет, який бачиш. Не на екран. Дай очам сфокусуватися на відстані.',
    challenge: 'Знайди там три деталі, яких раніше не помічав.',
  },
  {
    icon: '🌍',
    title: 'Маленький факт',
    text: 'Світло від Сонця летить до Землі приблизно 8 хвилин 20 секунд.',
    challenge: 'Тобто Сонце, яке ти бачиш, — це Сонце трохи більше ніж 8 хвилин тому.',
  },
  {
    icon: '✏️',
    title: 'Одна лінія',
    text: 'Спробуй намалювати будинок, не відриваючи ручку від паперу й не проводячи одну лінію двічі.',
    challenge: 'Не вийшло? Зміни точку, з якої починаєш.',
  },
];

export function isMicroBreakMoment(count: number) {
  return count === 5 || count === 11 || count === 17;
}

export function MicroBreak({
  count,
  onDone,
}: {
  count: number;
  onDone: () => void;
}) {
  const item = breaks[(count * 7) % breaks.length];
  return (
    <section className="panel micro-break" aria-label="Хвилинка пізнання і позитиву">
      <span className="micro-break-icon">{item.icon}</span>
      <small>ХВИЛИНКА ПІЗНАННЯ І ПОЗИТИВУ</small>
      <h2>{item.title}</h2>
      <p>{item.text}</p>
      <p className="micro-break-challenge">{item.challenge}</p>
      <button className="button" onClick={onDone}>
        Готово — продовжити
      </button>
    </section>
  );
}
