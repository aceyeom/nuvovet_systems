/**
 * Dose tick grid for the first 7 days (rows = doses per day, columns = days).
 * Paper-first: empty squares to tick by hand; a dash marks a day with no dose
 * (e.g. every-other-day schedules) or a day after the course ends.
 * tr(key, vars) and pk(value) are the handout-language helpers.
 */
export default function ScheduleGrid({ schedule, tr, pk }) {
  if (schedule.mode !== 'grid') return null
  return (
    <table className="pf-grid7" aria-label={tr('ho.gridLabel')}>
      <thead>
        <tr>
          <th scope="col" className="pf-grid7__corner">{tr('ho.day')}</th>
          {schedule.days.map((d) => (
            <th key={d.day} scope="col">{d.day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {schedule.slots.map((slot) => (
          <tr key={slot.id}>
            <th scope="row">{pk(slot.label)}</th>
            {schedule.days.map((d) => {
              const on = d.dosing && d.inCourse
              return (
                <td key={d.day} className={on ? '' : 'is-off'}>
                  {on ? <span className="pf-grid7__box" aria-hidden="true" /> : <span className="pf-grid7__dash" aria-hidden="true">–</span>}
                  <span className="pf-sr">{on ? tr('ho.tickSr') : tr('ho.noDoseSr')}</span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
