import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

/* Contributors page. Pulls the list live from the public GitHub REST API at
   view time (client-side only, so it's always current and needs no build-time
   token). Bots are filtered out and people are shown most-contributions-first. */

interface Contributor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

type Status = 'loading' | 'ready' | 'error';

const MEDALS = ['🥇', '🥈', '🥉'];

function ContributorCard({c, rank}: {c: Contributor; rank: number}) {
  return (
    <Link
      to={c.html_url}
      className="group flex h-full flex-col items-center border border-line bg-surface p-6 text-center no-underline shadow-card hover:border-brand/50">
      <div className="relative">
        <img
          src={c.avatar_url}
          alt=""
          width={88}
          height={88}
          loading="lazy"
          className="h-22 w-22 rounded-full border border-line"
          style={{width: 88, height: 88}}
        />
        {rank < 3 && (
          <span
            className="absolute -right-1 -top-1 text-2xl"
            aria-label={`Rank ${rank + 1}`}
            title={`Rank ${rank + 1}`}>
            {MEDALS[rank]}
          </span>
        )}
      </div>
      <h3 className="m-0 mt-4 text-base font-bold text-ink group-hover:text-brand">{c.login}</h3>
      <p className="m-0 mt-1 font-mono text-[0.85rem] text-ink-soft">
        {c.contributions.toLocaleString()} {c.contributions === 1 ? 'commit' : 'commits'}
      </p>
    </Link>
  );
}

function Contributors(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const org = siteConfig.organizationName ?? 'stoicescueric';
  const repo = siteConfig.projectName ?? 'control-lab';
  const repoUrl = `https://github.com/${org}/${repo}`;

  const [status, setStatus] = useState<Status>('loading');
  const [people, setPeople] = useState<Contributor[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`https://api.github.com/repos/${org}/${repo}/contributors?per_page=100`, {
      headers: {Accept: 'application/vnd.github+json'},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
        return res.json();
      })
      .then((data: Contributor[]) => {
        if (!active) return;
        const humans = data
          .filter((c) => c.type !== 'Bot')
          .sort((a, b) => b.contributions - a.contributions);
        setPeople(humans);
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [org, repo]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-14 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="m-0 mb-3 font-mono text-xs font-semibold text-brand uppercase">Thank you</p>
        <h1 className="m-0 text-3xl font-extrabold text-ink lg:text-4xl">Top contributors</h1>
        <p className="mt-4 text-ink-soft">
          Control Lab is open source. These are the people whose commits built and shaped it,
          ranked by contribution. Want to join them? See the{' '}
          <Link to={`${repoUrl}/blob/main/CONTRIBUTING.md`}>contributing guide</Link>.
        </p>
      </div>

      {status === 'loading' && (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {Array.from({length: 4}).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse border border-line bg-surface-2 shadow-card"
            />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="mx-auto mt-12 max-w-xl border border-line bg-surface-2 p-6 text-center text-ink-soft">
          <p className="m-0">
            Could not load the contributor list right now (the GitHub API may be rate-limited).
          </p>
          <Link className="button button--primary mt-4" to={`${repoUrl}/graphs/contributors`}>
            View contributors on GitHub
          </Link>
        </div>
      )}

      {status === 'ready' && people.length > 0 && (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {people.map((c, i) => (
            <ContributorCard key={c.id} c={c} rank={i} />
          ))}
        </div>
      )}

      {status === 'ready' && people.length === 0 && (
        <p className="mt-12 text-center text-ink-soft">No contributors found yet.</p>
      )}
    </section>
  );
}

export default function ContributorsPage(): ReactNode {
  return (
    <Layout
      title="Contributors"
      description="The people who build and maintain Control Lab, ranked by contribution.">
      <main>
        <Contributors />
      </main>
    </Layout>
  );
}
