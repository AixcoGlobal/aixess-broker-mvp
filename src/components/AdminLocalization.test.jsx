import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n.jsx';
import { translateAdmin } from '../admin-copy.js';
import AdminLogin from './AdminLogin.jsx';
import AdminDashboard from './AdminDashboard.jsx';

const response=body=>({ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>body});
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
for(const locale of ['en','de','pl','sl','ru']) {
  it(`localizes login, recovery and server errors in ${locale}`,async()=>{
    localStorage.setItem('aixess-language',locale);
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response({setupAvailable:false})).mockResolvedValueOnce({...response({error:'Email or password is incorrect.'}),ok:false}));
    render(<LanguageProvider><AdminLogin onSignedIn={vi.fn()}/></LanguageProvider>);
    const tr=(key)=>translateAdmin(locale,key);
    await waitFor(()=>expect(screen.getByRole('button',{name:tr('Sign in →')})).toBeEnabled());
    const email=screen.getByLabelText(tr('Email address'));
    fireEvent.invalid(email);
    expect(email.validationMessage).toBe({en:'Please complete this field.',de:'Bitte füllen Sie dieses Feld aus.',pl:'Uzupełnij to pole.',sl:'Izpolnite to polje.',ru:'Заполните это поле.'}[locale]);
    fireEvent.input(email,{target:{value:'qa@example.test'}});
    expect(email.validationMessage).toBe('');
    fireEvent.change(screen.getByLabelText(tr('Email address')),{target:{value:'qa@example.test'}});
    fireEvent.change(screen.getByLabelText(tr('Password'),{exact:true}),{target:{value:'testing-password'}});
    fireEvent.submit(screen.getByRole('button',{name:tr('Sign in →')}).closest('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent(tr('Email or password is incorrect.'));
    fireEvent.click(screen.getByRole('button',{name:tr('Forgot password?')}));
    expect(screen.getByRole('heading',{name:tr('Recover your account.')})).toBeVisible();
    expect(screen.getByLabelText(tr('Recovery code'))).toBeRequired();
  });
  it(`localizes dashboard labels without changing status payloads in ${locale}`,async()=>{
    localStorage.setItem('aixess-language',locale);
    const overview={days:7,from:Date.now()-7*86400000,updatedAt:Date.now(),sessions:0,leads:0,convertedSessions:0,events:[],trend:[],pages:[],floors:[],units:[],devices:[],locales:[]};
    vi.stubGlobal('fetch',vi.fn(async path=>response(path.includes('session')?{email:'qa@example.test',source:'D1'}:path.includes('overview')?overview:{rows:[],total:0})));
    render(<LanguageProvider><AdminDashboard/></LanguageProvider>);
    const tr=(key)=>translateAdmin(locale,key);
    expect(await screen.findByRole('heading',{name:tr('Audience over time')})).toBeVisible();
    const filter=screen.getByRole('combobox',{name:tr('Follow-up status')});
    expect(filter.querySelector('option[value="contacted"]')).toHaveTextContent(tr('contacted'));
    fireEvent.change(filter,{target:{value:'contacted'}});
    await waitFor(()=>expect(fetch.mock.calls.some(([path])=>path.includes('status=contacted'))).toBe(true));
  });
}
