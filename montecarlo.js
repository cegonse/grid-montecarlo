//
//  montecarlo.js
//  César González Segura, 2015-2016
//  <cegonse@posgrado.upv.es>, <cegonse@alumni.uv.es>
//
//  An application to do Montecarlo simulations using a Grid
//  infrastructure based on the Globus toolkit. In the included
//  files, the simulation is used to estimate the value of Pi.
//
//  To access the Grid and interact with the Globus toolkit
//  functions, the library Globus is used, which is on the
//  globus.js file.
//
//  This application needs the following files to work:
//  - ./etc/base.rsl: RSL definition file with the structure
//       that will be filled by the Globus library.
//  - ./etc/montecarlo.m: Octave script which will be executed
//       by all the nodes in the Grid.
//  - ./etc/post.m: Octave script to post-process the result
//       obtained on each node and get the final result.
//  - ./etc/rsl.json: JSON object containing the parameters to
//       fill the RSL specifications.
//
//  Once the application finishes executing, the following files
//  will be created:
//  - Many files on ./tmp: all files inside this directory are
//       workspace files and can be removed after the application
//       has finished executing.
//  - ./res/result.dlm: DLM file containing the final post-processed
//       result.
//
//  The application needs the following external modules to run,
//  all of them are available through the npm packet manager:
//  - readline-sync
//  - async
//
//  Tested and developed under Node v4.1.0 on Debian x64.
//
//  This application is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  It is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with these files.  If not, see <http://www.gnu.org/licenses/>.
//


var Globus = require('./globus.js');
var readlineSync = require('./node_modules/readline-sync');
var process = require('process');
var fs = require('fs');
var async = require('./node_modules/async');
var child_process = require('child_process');


// Variable declarations
var config = {
	grid: {
		ep: '',
		port: 0,
		user: '',
		pw: ''
	},
	
	auth: {
		key: '',
		cert: '',
		pw: ''
	}
};

var ctx = null;
var rl = null;
var stat = null;
var hosts = null;
var rsl = null;
var jsonRsl = null;
var uris = null;
var status = null;

async.series
([
	function(cb)
	{
		// Check if there is an existing configuration
		// file.
		try
		{
			stat = fs.statSync('./etc/conf.json');
		}
		catch (e)
		{
		}
		
		if (stat)
		{
			if (stat.isFile())
			{
				// File exists, load from saved configuration
				var json = fs.readFileSync('./etc/conf.json').toString();
				config = JSON.parse(json);
			}
		}
		else
		{
			// File doesn't exist, prompt the user
			console.log('Configuration file not found.');
			console.log('A new configuration file will be created.');
			
			config.grid.ep = readlineSync.question('Enter grid endpoint address: ').toString();
			config.grid.port = parseInt(readlineSync.question('Enter grid endpoint port: ').toString());
			config.grid.user = readlineSync.question('Enter grid username: ').toString();
			config.grid.pw = readlineSync.question('Enter grid password: ', { hideEchoBack: true }).toString();
			
			// Save the configuration
			fs.writeFileSync('./etc/conf.json', JSON.stringify(config));
		}
		
		cb();
	},
	
	function(cb)
	{
		// Create the Globus manager
		ctx = new Globus(config.grid);
		cb();
	},
	
	function(cb)
	{
		// Fetch the host list
		ctx.hostList(function(err,list)
		{
			if (err)
			{
				console.log('> Failed to retrieve host list.');
				process.exit(0);
			}
			else
			{
				console.log('> Retrieved host list.');
				hosts = list;
				cb();
			}
		});
	},
	
	function(cb)
	{
		// Load the configuration file containing
		// the RSL file data
		try
		{
			jsonRsl = fs.readFileSync('./etc/rsl.json');
			jsonRsl = JSON.parse(jsonRsl);
			
			rsl = new Array();
			var tmp = null;
			
			// Generate the specific RSL for each host
			for (var i = 0; i < hosts.length; i++)
			{
				tmp = JSON.parse(JSON.stringify(jsonRsl));
				tmp.outFile = 'result_' + i + '.dlm';
				tmp.arguments = jsonRsl.arguments + ' ' + i + ' ' + hosts.length;
				
				rsl.push(tmp);
			}
			
			console.log('> Loaded RSL specification.');
			cb();
		}
		catch (e)
		{
			console.log('> Failed to load RSL specification.');
			process.exit(0);
		}
	},
	
	function(cb) 
	{
		// If empty, prompt for proxy configuration
		if (config.auth.key == '')
		{
			console.log('Proxy auth configuration not found.');
			console.log('The configuration file will be updated.');
			
			config.auth.cert = readlineSync.question('Enter grid-local path to the user certificate: ').toString();
			config.auth.key = readlineSync.question('Enter grid-local path to the user key: ').toString();
			config.auth.pw = readlineSync.question('Enter certificate password: ', { hideEchoBack: true }).toString();
			
			// Save the configuration
			fs.writeFileSync('./etc/conf.json', JSON.stringify(config));
		}
		
		cb();
	},
	
	function(cb) 
	{
		// Create the grid proxy
		ctx.proxyInit(config.auth.key, config.auth.cert, config.auth.pw, function(err, info)
		{
			if (err)
			{
				console.log('> Failed to init grid proxy.');
				process.exit(0);
			}
			else
			{
				console.log('> Grid proxy created by ' + info.identity.name + ' from ' + 
					info.identity.organization + ' (' + info.identity.country + ')' + ', valid until ' + 
					info.expiry + '.');
				cb();
			}
		});
	},
	
	function(cb)
	{
		// Start the GASS server on the port 44000
		ctx.gassStart(44000, function(err)
		{
			if (err)
			{
				console.log('> Failed to start GASS server.');
				ctx.proxyDestroy();
				process.exit(0);
			}
		});
		
		cb();
	},
	
	function(cb)
	{
		// Stage-in the script to the grid
		ctx.stageIn('./etc/' + jsonRsl.inFile, '/tmp/' + jsonRsl.inFile, function(err)
		{
			if (err)
			{
				console.log('> Failed to stage-in \"' + jsonRsl.inFile + '\".');
				ctx.gassStop();
				ctx.proxyDestroy();
				process.exit(0);
			}
			
			console.log('> \"' + jsonRsl.inFile + '\" staged in.');
			cb();
		});
	},
	
	function(cb)
	{
		// Stage-in the RSL file
		function rslfn(i)
		{
			fs.writeFileSync('./tmp/run_' + i + '.rsl', ctx.rsl(rsl[i]));
			
			ctx.stageIn('./tmp/run_' + i + '.rsl', '/tmp/run_'+ i + '.rsl', function(err)
			{
				if (err)
				{
					console.log('> Failed to stage-in RSL specification file.');
					ctx.gassStop();
					ctx.proxyDestroy();
					process.exit(0);
				}
				
				i++;
				
				if (i < hosts.length)
				{
					rslfn(i);
				}
				else
				{
					console.log('> RSL specification staged in.');
					cb();
				}
			});
		}
		
		rslfn(0);
	},
	
	function(cb)
	{
		uris = new Array();
		status = new Array();
		
		// Run the script on all the nodes and get the status URI's
		function runfn(i)
		{
			ctx.run('/tmp/run_' + i + '.rsl', hosts[i], function(err,uri)
			{
				if (err)
				{
					console.log('> Failed to run in ' + hosts[i] + '. Aborting.');
					ctx.gassStop();
					ctx.proxyDestroy();
					process.exit(0);
				}

				uris.push(uri);
				status.push('UNSUBMITTED');
				console.log('> Started job on ' + hosts[i]);
				
				i++;
				
				if (i < hosts.length)
				{
					runfn(i);
				}
				else
				{
					cb();
				}
			});	
		}
		
		// Start the loop
		runfn(0);
	},
	
	function(cb)
	{
		// Every 5 seconds, check the state of the job
		// on all the nodes. Wait until all the nodes
		// have finished.
		var tm = setInterval(statfun, 5000);
		
		function statfun()
		{
			// Go through all the jobs and update their status
			function checkfn(i)
			{
				if (status[i] != 'DONE')
				{
					ctx.status(uris[i], function(err,st)
					{
						if (err)
						{
							console.log('> Failed to retrieve status from ' + hosts[i] + '. Skipping.');
						}
						else
						{
							if (st == 'DONE' && status[i] != 'DONE')
							{
								console.log('> Job finished on ' + hosts[i] + '.');
							}
							
							status[i] = st;
							
							i++;
				
							if (i < status.length)
							{
								checkfn(i);
							}
						}
					});
				}
				else
				{
					i++;
				
					if (i < status.length)
					{
						checkfn(i);
					}
				}
			}
			
			// Start the loop
			checkfn(0);
			
			// Check all the statuses, if all jobs have finished
			// go to the next step.
			var done = true;
			
			for (var i = 0; i < status.length; i++)
			{
				if (status[i] != 'DONE')
				{
					done = false;
				}
			}
			
			if (done)
			{
				console.log('> All jobs finished.');
				
				clearInterval(tm);
				cb();
			}
		}
	},
	
	function(cb)
	{
		// Stage-out the result files from the grid
		// Stage-in the RSL file
		function outfn(i)
		{
			ctx.stageOut('/tmp/' + rsl[i].outFile, './tmp/' + rsl[i].outFile, function(err)
			{
				if (err)
				{
					console.log('> Failed to stage-out a result file: ' + err.toString());
					ctx.gassStop();
					ctx.proxyDestroy();
					process.exit(0);
				}
				
				i++;
				
				if (i < hosts.length)
				{
					outfn(i);
				}
				else
				{
					console.log('> Staged-out the result files.');
					cb();
				}
			});
		}
		
		outfn(0);
	},
	
	function(cb)
	{
		// Post-process the resulting data.
		child_process.execSync('octave -q ./etc/post.m ' + hosts.length);
	},
	
	function(cb) 
	{
		// Stop the GASS server.
		ctx.gassStop();
			
		// Destroy the grid proxy.
		ctx.proxyDestroy();
		
		console.log('> Process completed');
		cb();
	}
]);
