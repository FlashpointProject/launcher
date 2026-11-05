import * as https from 'node:https';
import * as dns from 'node:dns';
import * as dnsPacket from 'dns-packet';
import _axios from 'axios';
import { Agent } from 'node:https';
import { VERSION } from '@shared/version';

let id = 0;

function getId(): number {
  id += 1;
  if (id >= 65535) {
    id = 0;
  }

  return id;
}

type DnsResult = {
  address: string;
  family: number;
  expiry: number;
}

const dnsCache = new Map<string, DnsResult>;

const lookup = (
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number
) => void): void => {
  // Check DNS cache first
  const cachedResult = dnsCache.get(hostname);
  if (cachedResult && cachedResult.expiry > Date.now()) {
    callback(null, cachedResult.address, cachedResult.family);
    return;
  }

  const buf = dnsPacket.encode({
    type: 'query',
    id: getId(),
    flags: dnsPacket.RECURSION_DESIRED,
    questions: [{
      type: 'A',
      name: hostname
    }]
  });

  const reqOpts = {
    hostname: 'cloudflare-dns.com',
    port: 443,
    path: '/dns-query',
    method: 'POST',
    headers: {
      'Content-Type': 'application/dns-message',
      'Content-Length': Buffer.byteLength(buf)
    }
  }
  
  const request = https.request(reqOpts, (response) => {
    response.on('data', (d) => {
      const result = dnsPacket.decode(d);
      if (result.answers && result.answers.length > 0) {
        const answer: any = result.answers[0];
        dnsCache.set(hostname, {
          address: answer.data,
          family: 4,
          expiry: Date.now() + (answer.ttl * 1000)
        });
        callback(null, answer.data, 4);
      } else {
        callback(new Error('No answers in DNS response'), '', 0);
      }
    })
  })

  
  request.on('error', (e) => {
    console.error(e);
    callback(e, '', 0);
  })
  request.write(buf)
  request.end()
}

const agent = new Agent({
  lookup
});

export const axios = _axios.create({
  headers: {
    'User-Agent': 'Flashpoint Launcher/' + VERSION,
    'x-launcher-version': VERSION
  }
})