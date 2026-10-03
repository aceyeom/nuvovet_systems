/**
 * Dose tick grid for the first 7 days (rows = doses per day, columns = days). Paper-first: empty
 * squares to tick by hand; a dash marks a day with no dose (e.g. every-other-day schedules) or a
 * day after the course ends. tr(key, vars) and pk(value) are the handout-language helpers.
 */
export default function ScheduleGrid({ schedule, tr, pk }) {
  if (schedule.mode !== 'grid') return null
  return (
    <table className="w-full max-w-[420px] border-collapse text-xs" aria-label={tr('ho.gridLabel')}>
      <thead>
        <tr>
          <th scope="col" className="h-6 border border-border px-1.5 text-left font-medium text-muted-foreground">{tr('ho.day')}</th>
          {schedule.days.map((d) => (
            <th key={d.day} scope="col" className="num h-6 border border-border px-1 text-center font-medium text-muted-foreground">{d.day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {schedule.slots.map((slot) => (
          <tr key={slot.id}>
            <th scope="row" className="h-7 border border-border px-1.5 text-left font-normal text-text-2">{pk(slot.label)}</th>
            {schedule.days.map((d) => {
              const on = d.dosing && d.inCourse
              return (
                <td key={d.day} className="h-7 border border-border text-center">
                  {on ? <span className="pf-box" aria-hidden="true" /> : <span className="text-muted-foreground" aria-hidden="true">–</span>}
                  <span className="sr-only">{on ? tr('ho.tickSr') : tr('ho.noDoseSr')}</span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
