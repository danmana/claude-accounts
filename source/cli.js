#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
		Usage
		  $ claude-accounts

		Examples
		  $ claude-accounts

		  Current account:
		  lorem.ipsum@example.com (org: e7b0fffc)

		  Select a different account:
		   demo.account@gmail.com (org: aeb81593)
		 ❯ lorem.ipsum@example.com (org: e7b0fffc)
		   lorem.ipsum@example.com (org: 3f8cce19)
		   add new (claude /login)
		   exit (esc) 
	`,
	{
		importMeta: import.meta,
	},
);

render(<App name={cli.flags.name} />);
