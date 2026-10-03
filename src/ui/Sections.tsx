import { RESUME_URL } from '../content/links'
import { useContent, useStore } from '../store'
import { Laptop } from './Laptop'
import { Scramble } from './Scramble'

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="tags">
      {items.map((item) => (
        <li key={item} className="tag">
          {item}
        </li>
      ))}
    </ul>
  )
}

function Pager({
  index,
  total,
  counter,
  prev,
  next,
  onChange,
}: {
  index: number
  total: number
  counter: string
  prev: string
  next: string
  onChange: (index: number) => void
}) {
  return (
    <div className="pager">
      <button className="pager__step" onClick={() => onChange(index - 1)} aria-label={prev}>
        ←
      </button>
      <span className="pager__count">
        {counter.replace('{current}', String(index + 1)).replace('{total}', String(total))}
      </span>
      <span className="pager__dots" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <button key={i} tabIndex={-1} className={`pager__dot${i === index ? ' is-active' : ''}`} onClick={() => onChange(i)} />
        ))}
      </span>
      <button className="pager__step" onClick={() => onChange(index + 1)} aria-label={next}>
        →
      </button>
    </div>
  )
}

export function Hero() {
  const { ui, profile } = useContent()
  const [first, ...rest] = profile.name.split(' ')
  return (
    <div className="hero">
      <p className="hero__kicker">{ui.hero.kicker}</p>
      <p className="hero__name" aria-hidden="true">
        <Scramble text={first} />
        <Scramble text={rest.join(' ')} />
      </p>
      <p className="hero__title">{profile.title}</p>
      <p className="hero__tagline">{profile.tagline}</p>
      <p className="hero__now">{ui.hero.now}</p>
      <p className="hero__experience">{ui.hero.experience}</p>
      <p className="hero__status">
        <span className="dot" aria-hidden="true" />
        {profile.status} · {profile.location}
      </p>
      <p className="hero__actions">
        <a className="btn btn--primary btn--download" href={RESUME_URL} download>
          {ui.hero.resume}
        </a>
      </p>
      <p className="hero__scroll">
        <span className="hero__scroll-arrow" aria-hidden="true">
          ↓
        </span>{' '}
        {ui.hero.scrollHint}
      </p>
    </div>
  )
}

export function Profile() {
  const { ui, profile, education } = useContent()
  const rows = [
    [ui.keys.name, profile.name],
    [ui.keys.title, profile.title],
    [ui.keys.base, profile.location],
    [ui.keys.focus, profile.focus],
    [ui.keys.status, profile.status],
  ]
  return (
    <>
      <dl className="manifest">
        {rows.map(([key, value]) => (
          <div key={key} className="manifest__row">
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="subhead">{ui.profile.about}</h2>
      {profile.about.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <h2 className="subhead">{ui.profile.education}</h2>
      <ul className="plain-list">
        {education.map((item) => (
          <li key={item.school}>
            <span>
              {item.school} · {item.course}
            </span>
            <span className="muted small">{item.period}</span>
          </li>
        ))}
      </ul>
      <h2 className="subhead">{ui.profile.studying}</h2>
      <p>{profile.studying}</p>
    </>
  )
}

export function Skills() {
  const { ui, skills } = useContent()
  const setSkillFocus = useStore((state) => state.setSkillFocus)
  const focus = useStore((state) => state.skillFocus)
  return (
    <>
      <p className="muted small">{ui.skills.hint}</p>
      <ul className="skills" onMouseLeave={() => setSkillFocus(null)}>
        {skills.map((group, index) => (
          <li
            key={group.group}
            className={`skills__group${focus === index ? ' is-active' : ''}`}
            tabIndex={0}
            onMouseEnter={() => setSkillFocus(index)}
            onFocus={() => setSkillFocus(index)}
            onBlur={() => setSkillFocus(null)}
          >
            <h2 className="subhead">
              <span className="skills__star" aria-hidden="true">
                ✦
              </span>
              {group.group}
            </h2>
            <Tags items={group.items} />
          </li>
        ))}
      </ul>
    </>
  )
}

export function Missions() {
  const { ui, missions } = useContent()
  const index = useStore((state) => state.mission)
  const setMission = useStore((state) => state.setMission)
  const mission = missions[index]
  return (
    <>
      <Pager
        index={index}
        total={missions.length}
        counter={ui.missions.counter}
        prev={ui.missions.prev}
        next={ui.missions.next}
        onChange={setMission}
      />
      <article className="card" key={index} aria-live="polite">
        <h2 className="card__title">{mission.company}</h2>
        <p className="card__role">{mission.role}</p>
        <p className="muted small">{mission.place}</p>
        {mission.metrics && (
          <dl className="readout" aria-label={ui.missions.telemetry}>
            {mission.metrics.map((metric) => (
              <div key={metric.label} className="readout__item">
                <dt>{metric.label}</dt>
                <dd>
                  <s>{metric.from}</s>
                  <span aria-hidden="true"> → </span>
                  <b>{metric.to}</b>
                </dd>
              </div>
            ))}
          </dl>
        )}
        <ul className="bullets">
          {mission.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
        <Tags items={mission.stack} />
      </article>
      <p className="muted small hint-keys">{ui.missions.hint}</p>
    </>
  )
}

export function Projects() {
  const { ui, projects } = useContent()
  const index = useStore((state) => state.project)
  const setProject = useStore((state) => state.setProject)
  const project = projects[index]
  return (
    <>
      <Pager
        index={index}
        total={projects.length}
        counter={ui.projects.counter}
        prev={ui.projects.prev}
        next={ui.projects.next}
        onChange={setProject}
      />
      <article className="card" key={index} aria-live="polite">
        <h2 className="card__title">{project.title}</h2>
        <p className="card__role">
          {project.kind}
          {project.date && <span className="muted"> · {project.date}</span>}
        </p>
        {project.site && <Laptop {...project.site} hint={ui.projects.screen} />}
        <p>{project.description}</p>
        <Tags items={project.stack} />
        {(project.demo || project.repo) && (
          <p className="card__links">
            {project.demo && (
              <a className="btn btn--primary" href={project.demo} target="_blank" rel="noreferrer">
                {ui.projects.demo}
              </a>
            )}
            {project.repo && (
              <a className="btn" href={project.repo} target="_blank" rel="noreferrer">
                {ui.projects.repo}
              </a>
            )}
          </p>
        )}
      </article>
      <p className="muted small hint-keys">{ui.projects.hint}</p>
    </>
  )
}

export function Contact() {
  const { ui, profile } = useContent()
  const { email, github, linkedin } = profile.links
  const links = [
    [ui.contact.email, `mailto:${email}`, email],
    [ui.contact.github, github, github.replace('https://', '')],
    [ui.contact.linkedin, linkedin, linkedin.replace('https://www.', '')],
  ]
  return (
    <>
      <p className="lead">{ui.contact.lead}</p>
      <ul className="contact-links">
        {links.map(([label, href, text]) => (
          <li key={label}>
            <span className="contact-links__label">{label}</span>
            <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
              {text}
            </a>
          </li>
        ))}
      </ul>
      <p className="hero__status">
        <span className="dot" aria-hidden="true" />
        {profile.status} · {profile.location}
      </p>
    </>
  )
}
