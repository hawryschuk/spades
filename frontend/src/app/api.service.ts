import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Injectable } from '@angular/core';
import { catchError, combineAll, debounceTime, delay, distinctUntilChanged, filter, last, map, mergeMap, mergeMapTo, publishReplay, reduce, refCount, retry, retryWhen, startWith, switchMap, take, tap } from 'rxjs/operators';
import { TerminalRestApiClient } from '../../../../@hawryschuk-terminal-restapi/TerminalRestApiClient';
import { MinimalHttpClient } from '../../../../@hawryschuk-terminal-restapi/MinimalHttpClient';
import { BehaviorSubject, combineLatest, from, interval, merge, Observable, of } from 'rxjs';
import { WebTerminal } from '../../../../@hawryschuk-terminal-restapi';
import { Util } from '@hawryschuk/common';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    public http: HttpClient,
  ) {
    (window as any).api = this;
  }

  //#region Loader
  get loading() { return this._loading.length }
  private _loading = [];
  async load({
    block,
    title = new Error().stack,
    wait = true,
    waitForStdout = true,
    skipIfLoading = false,
  } = {} as {
    block: Function;
    title?: string;
    wait?: boolean;
    waitForStdout?: boolean;
    skipIfLoading?: boolean;
  }) {
    if (this.loading && skipIfLoading) return Promise.resolve(null);
    this._loading.push({ block, title });
    const terminal = await this.terminal;
    const { history: { length } } = terminal;
    if (wait) await Util.waitUntil(() => this._loading[0].block === block);
    return await Promise.resolve(1)
      .then(<any>block)
      .finally(() => waitForStdout && Util.waitUntil(() => terminal.history.length > length))
      .finally(() => this._loading.splice(this._loading.findIndex(i => i.block === block), 1))
  }

  features = new (class {  // api.features.aws=false;
    constructor(public api: ApiService) { }

    get cli() { return !!localStorage.getItem('feat.cli'); }
    set cli(b: boolean) { localStorage.setItem('feat.cli', b ? '1' : ''); }

    get localhost() { return !!localStorage.getItem('feat.localhost'); }
    set localhost(b: boolean) { localStorage.setItem('feat.localhost', b ? '1' : ''); this.baseuri = this.baseuri }

    get glitch() { return !!localStorage.getItem('feat.glitch'); }
    set glitch(b: boolean) { localStorage.setItem('feat.glitch', b ? '1' : ''); this.baseuri = this.baseuri }

    set baseuri(v: string) { localStorage.setItem('feat.baseuri', v || ''); this.api.baseuri$.next(v); }
    get baseuri() { return localStorage.getItem('feat.baseuri') || (this.glitch && 'https://hawryschuk-terminals.glitch.me') || (this.localhost && 'http://localhost:8001') || '' }

    get service() { return localStorage.getItem('feat.service') || 'table-service'; }
    set service(v: string) { localStorage.setItem('feat.service', v || ''); this.api.service$.next(v); }

    get instance() { return localStorage.getItem('feat.instance'); }
    set instance(v: string) { localStorage.setItem('feat.instance', v || ''); this.api.instance$.next(v); }

    get terminal() { return localStorage.getItem('feat.terminal'); }
    set terminal(v: string) { localStorage.setItem('feat.terminal', v || ''); this.api.terminalId$.next(v); }


    autoconnect = true;

    autoplay = false;
  })(this);

  async test() {
    const david = nacl.box.keyPair();
    const viktoria = nacl.box.keyPair();

    const davidEncrypting = () => {
      //David computes a one time shared key
      const david_shared_key = nacl.box.before(viktoria.publicKey, david.secretKey);

      //David also computes a one time code.
      const one_time_code = nacl.randomBytes(24);

      //Davids message
      const plain_text = "Hey!!, our communication is now more secure";

      //Getting the cipher text
      const cipher_text = nacl.box.after(
        naclUtil.decodeUTF8(plain_text),
        one_time_code,
        david_shared_key
      );

      //message to be transited.
      const message_in_transit = { cipher_text, one_time_code };

      return message_in_transit;
    };

    const viktoriaDecrypting = (message) => {
      //Getting Viktoria's shared key
      const viktoria_shared_key = nacl.box.before(david.publicKey, viktoria.secretKey);

      //Get the decoded message
      let decoded_message = nacl.box.open.after(message.cipher_text, message.one_time_code, viktoria_shared_key);

      //Get the human readable message
      let plain_text = naclUtil.encodeUTF8(decoded_message)

      //return the message
      return plain_text;
    };

    const encrypted1 = davidEncrypting();

    debugger;

    let serialize: any = enc => btoa(String.fromCharCode.apply(null, enc));
    serialize = enc => Array.from(enc);
    let encrypted2 = {
      cipher_text: serialize(encrypted1.cipher_text),
      one_time_code: serialize(encrypted1.one_time_code)
    }
    let deserialize = m => new Uint8Array(atob(serialize(m)).split("").map((char) => char.charCodeAt(0)));
    deserialize = m => new Uint8Array(atob(serialize(m)).split("").map((char) => char.charCodeAt(0)));
    let encrypted3 = {
      cipher_text: deserialize(encrypted2.cipher_text),
      one_time_code: deserialize(encrypted2.one_time_code)
    }

    const decrypted1 = viktoriaDecrypting(encrypted3);

    debugger;


  }

  get terminal() { return this.terminal$.pipe(take(1)).toPromise() }

  get terminals(): Promise<WebTerminal[]> {
    return Util.waitUntil(async () => {
      await Util.waitUntil(() => { return TerminalRestApiClient.httpClient; }, { pause: 1000 });
      const terminals = await TerminalRestApiClient.terminals.catch(e => null);
      const hasFree = terminals && terminals.find(t => !t.owner) && terminals;
      if (!hasFree) await Util.pause(1000);
      if (!terminals) { throw new Error('couldnt fetch terminals') }
      console.log('has free ?', { hasFree, terminals })
      return hasFree;
    });
  }

  refresh$ = new BehaviorSubject(new Date);
  baseuri$ = new BehaviorSubject(this.features.baseuri);
  service$ = new BehaviorSubject(this.features.service);
  instance$ = new BehaviorSubject(this.features.instance);
  terminalId$ = new BehaviorSubject(this.features.terminal);

  terminals$ = combineLatest([this.baseuri$, this.refresh$])
    .pipe(debounceTime(2500))
    .pipe(tap(console.log))
    .pipe(tap(([baseuri]) => TerminalRestApiClient.httpClient = this.httpClientAdapter))
    .pipe(switchMap(async () => await TerminalRestApiClient.terminals))
    .pipe(publishReplay(1), refCount());

  terminal$: Observable<WebTerminal> = combineLatest([this.service$, this.instance$, this.terminalId$, this.terminals$, of({} as any)])
    .pipe(distinctUntilChanged((a, b) => Util.equalsDeep(a.slice(0, 3), b.slice(0, 3))))
    .pipe(switchMap(async ([service, instance, id, terminals, vars]) => {
      console.log('computing terminal...')
      let terminal: WebTerminal = vars.last;
      if (!Util.matches(terminal || {}, { service, instance, id })) {
        terminal = Util.findWhere(terminals, { service, instance, id });
        if (!terminal && this.features.autoconnect && terminals.find(t => !t.owner)) {
          const { service, instance, id } = terminals.find(t => !t.owner);
          Object.assign(this.features, { service, instance, terminal: id });
        }
        terminal &&= await WebTerminal
          .retrieve({ baseuri: this.baseuri$.value, service, instance, id, owner: 'terminals-gui-' + Util.UUID })
          .catch(e => { console.error(e); return null as WebTerminal });
        if (terminal) {
          terminal
            .updated$
            .pipe(filter(() => !!terminal.finished), take(1))
            .subscribe(() => { // the terminal may finish from a 404 on synchronize/maintain
              console.log(`the terminal is finished, now wwe wil find a new terminal `)
              if (this.features.instance == terminal.instance) this.features.instance = '';
              if (this.features.terminal == terminal.id) this.features.terminal = '';
            });
        }
      }

      if (vars.last && vars.last !== terminal) vars.last.finish();
      console.log('/computed', terminal)

      if (!terminal) {              // 
        Util.pause(5000).then(() => {
          if (!this.features.terminal)
            this.refresh$.next(new Date);
        }); //retry after 5 seconds
      }

      return vars.last = terminal;
    }))
    .pipe(catchError((error, caught) => { debugger; return of(null); }))
    .pipe(distinctUntilChanged())
    .pipe(tap(terminal => console.log({ terminal })))
    .pipe(publishReplay(1), refCount());


  get httpClientAdapter(): MinimalHttpClient {
    return TerminalRestApiClient.httpClient = async ({
      method = 'get' as 'get' | 'post' | 'put' | 'delete',
      url = '' as string,
      body = null as any,
      responseType = 'json' as 'arraybuffer' | 'blob' | 'text' | 'json',
      headers = {} as { [header: string]: string | string[]; }
    }) => {
      const result$ = this
        .http
        .request(
          method.toUpperCase(),
          `${this.features.baseuri}/${url}`,
          {
            headers,
            body,
            responseType
          }
        )
        .pipe(retryWhen(errors => errors.pipe(delay(200), take(3))))
        .pipe(catchError(async error => {
          console.error('http error')
          if (error.message.endsWith('0 Unknown Error'))
            throw new Error('Server Error (might be down)');
          else
            throw new Error(typeof error.error === 'string' ? error.error : error.error?.error || error.message || error);
        }))
        .pipe(take(1))
        .toPromise();
      // await (this.queue$ = this.queue$.then(() => result$.catch(e => null)));
      return await result$;
    }
  }
}
