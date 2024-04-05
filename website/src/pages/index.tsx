import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary')}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div>
          <Link
            className="button button--secondary button--lg"
            to="/docs/introduction">
            Getting Started
          </Link>
          <br></br><br></br>
          <Link
            className="button button--secondary button--lg"
            to="/docs/configuration/services">
            Configuration
          </Link>
          <br></br><br></br>
          <Link
            className="button button-->secondary button--lg"
            to="/docs/development/introduction">
            Launcher Development
          </Link>
          <br></br><br></br>
          <Link
            className="button button--secondary button--lg"
            to="/docs/extensions/overview">
            Extension Development
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Documentation for the Flashpoint Launcher application">
      <HomepageHeader />
      <main>
      </main>
    </Layout>
  );
}
