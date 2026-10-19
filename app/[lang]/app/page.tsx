import { notFound } from "next/navigation";
import { LangSwitch } from "@/components/LangSwitch";
import { DEFAULT_DAY } from "@/components/session";
import { TryIt } from "@/components/TryIt";
import { Wordmark } from "@/components/Wordmark";
import { parseDay, tryParseDay } from "@/domain/dates";
import { evaluateCases } from "@/domain/evaluate";
import { CaseListSchema } from "@/domain/invoice";
import { compareStrategies } from "@/domain/simulate";
import { dict } from "@/i18n/dictionary";
import { fill, isLocale, projectsUrl, REPO_URL } from "@/i18n/locales";
import { loadFixtureInvoices } from "@/services/invoices";
import { serviceModes } from "@/services/mode";
import casesData from "../../../fixtures/cases.json";

const COMPARE_DAYS = 30;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const d = dict[lang];
  const query = await searchParams;
  const requested = firstValue(query.today);
  const requestedDay =
    requested !== undefined && tryParseDay(requested) !== null ? requested : undefined;

  const invoices = loadFixtureInvoices();
  const comparison = compareStrategies(invoices, parseDay(DEFAULT_DAY), COMPARE_DAYS);
  const evaluation = evaluateCases(CaseListSchema.parse(casesData));
  const rows = [
    { label: d.compare.rows.total, rules: comparison.rules.total, naive: comparison.naive.total },
    {
      label: d.compare.rows.perInvoiceWeek,
      rules: comparison.rules.perInvoiceWeek,
      naive: comparison.naive.perInvoiceWeek,
    },
    { label: d.compare.rows.held, rules: comparison.rules.held, naive: comparison.naive.held },
    {
      label: d.compare.rows.paidUp,
      rules: comparison.rules.paidUp,
      naive: comparison.naive.paidUp,
    },
  ];
  const scoreText = fill(d.compare.evalValue, {
    score: evaluation.score,
    decisions: evaluation.decisions,
    cases: evaluation.cases,
  });

  return (
    <div className="page">
      <header className="topbar">
        <a href={projectsUrl(lang)}>{d.nav.allProjects}</a>
        <Wordmark lang={lang} />
        <LangSwitch lang={lang} />
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <h1 id="hero-title">{d.hero.name}</h1>
          <p className="one-liner">{d.hero.oneLine}</p>
          <ul className="chips">
            {d.hero.chips.map((chip) => (
              <li key={chip}>{chip}</li>
            ))}
          </ul>
        </section>

        <section className="section" aria-labelledby="analogy-title">
          <h2 id="analogy-title">{d.analogy.title}</h2>
          <p>{d.analogy.body}</p>
          <h3>{d.analogy.glossaryTitle}</h3>
          <dl className="glossary">
            {d.analogy.terms.map((item) => (
              <div key={item.term}>
                <dt>{item.term}</dt>
                <dd>{item.definition}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="section" aria-labelledby="try-title">
          <h2 id="try-title">{d.tryIt.title}</h2>
          <TryIt
            lang={lang}
            invoices={invoices}
            requestedDay={requestedDay}
            services={serviceModes()}
          />
        </section>

        <section className="section" aria-labelledby="compare-title">
          <h2 id="compare-title">{d.compare.title}</h2>
          <p>{fill(d.compare.intro, { days: COMPARE_DAYS, start: DEFAULT_DAY })}</p>
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">{d.compare.columns.measure}</th>
                <th scope="col">{d.compare.columns.rules}</th>
                <th scope="col">{d.compare.columns.naive}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td className="num">{row.rules}</td>
                  <td className="num">{row.naive}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>{d.compare.evalTitle}</h3>
          <p className="eval-score">{scoreText}</p>
          <p className="muted">{d.compare.note}</p>
        </section>

        <section className="section" aria-labelledby="fits-title">
          <h2 id="fits-title">{d.fits.title}</h2>
          <div className="columns">
            <div>
              <h3>{d.fits.worthTitle}</h3>
              <ul>
                {d.fits.worth.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>{d.fits.notNeededTitle}</h3>
              <ul>
                {d.fits.notNeeded.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="proves-title">
          <h2 id="proves-title">{d.proves.title}</h2>
          <p>{d.proves.body}</p>
        </section>

        <details className="engineers">
          <summary>{d.engineers.title}</summary>
          <h3>{d.engineers.mechanism}</h3>
          <p>{d.engineers.mechanismBody}</p>
          <h3>{d.engineers.rulesHeader}</h3>
          <ol className="rules">
            {d.engineers.rules.map((rule) => (
              <li key={rule}>{rule.replace(/^\d+\.\s*/, "")}</li>
            ))}
          </ol>
          <h3>{d.engineers.testingTitle}</h3>
          <p>{d.engineers.testingBody}</p>
          <p>
            {d.compare.evalTitle}: <strong>{scoreText}</strong>
          </p>
          <p>{d.engineers.stackLine}</p>
          <p>
            <a href={REPO_URL}>{d.engineers.repoLink}</a>
          </p>
        </details>
      </main>
    </div>
  );
}
