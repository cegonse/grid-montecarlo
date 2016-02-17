//
//  grid.js
//  César González Segura, 2015-2016
//  <cegonse@posgrado.upv.es>, <cegonse@alumni.uv.es>
//
//  A simple library to access the Globus toolkit functions
//  on the Grid entry point node through SSH.
//
//  This library needs the following external modules to run,
//  all of them are available through the npm packet manager:
//  - ssh2
//
//  Tested and developed under Node v4.1.0 on Debian x64.
//
//  This library is free software: you can redistribute it and/or modify
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

var SSH = require('./node_modules/ssh2').Client;
var fs = require('fs');

//
// Globus class constructor.
//
// Takes the grid configuration as the input argument,
// an object containing:
// - ep: internet address of the Grid entrypoint.
// - port: port of the Grid entrypoint.
// - user: username to log-in on the Grid entrypoint.
// - pw: password to use when logging-in on the Grid entrypoint.
//
function Globus(params)
{
	this.hostname = params.ep;
	this.port = params.port;
	this.username = params.user;
	this.password = params.pw;
	this.rslBase = '';
	
	this.gassActive = false;
	this.proxyActive = false;
}


//
// hasGass() method.
// (Sync)
//
//
// This method retrieves if a GASS server has been started or not.
//
// Input parameters:
// - None.
//
// Output parameters:
// - True if a GASS server has been started on the Grid entrypoint,
//   false otherwise.
//
Globus.prototype.hasGass = function()
{
	return this.gassActive;
}


//
// hasProxy() method.
// (Sync)
//
// This method retrieves if a proxy has been created or not.
//
// Input parameters:
// - None.
//
// Output parameters:
// - True if a proxy has been created on the Grid entrypoint,
//   false otherwise.
//
Globus.prototype.hasProxy = function()
{
	return this.proxyActive;
}


//
// hostList() method.
// (Async)
//
// This method obtains the Grid host list from the Grid entrypoint.
// In this case, Globus MDS system is not used and the list is
// fetched using the "/etc/hosts" file on the Grid entrypoint.
//
// The "/etc/hosts" must be formated in the following fashion:
// - Each host must be on a separate line.
// - The host name must be separated from the host IP address
//   using a tab (\t).
// If the "hosts" file doesn't follow this convention, the method
// will likely fail.
//
// Input parameters:
// - cb: callback called when the command finishes. The callback
//       can have two arguments: err, containing a message string
//       if an error has occured or null if there has been no error,
//       and list containing a string list with the hosts retrieved
//       from the entrypoint.
//
// Output parameters:
// - None.
//
Globus.prototype.hostList = function(cb)
{
	var list = new Array();
	var fd = new SSH();
	
	fd.connect(
	{
		host: this.hostname,
		port: this.port,
		username: this.username,
		password: this.password
	});
	
	fd.on('ready', function()
	{	
		fd.exec('cat /etc/hosts', function(err,stream)
		{
			if (err)
			{
				fd.end();
				
				if (cb)
				{
					cb(err);
				}
			}
			else
			{
				stream.on('close', function(code,signal)
				{
					fd.end();
					
					if (cb)
					{
						cb(null,list);
					}
				});
				
				stream.on('data', function(data)
				{
					var d = data.toString().split('\n');
					
					for (var i = 1; i < d.length - 1; i++)
					{
						var dd = d[i].split('\t')[1].split('\r')[0];
						
						if (dd != undefined)
						{
							list.push(dd);
						}
					}
				});
			}
		});
	});
};


//
// proxyInit() method.
// (Async)
//
// This method creates a proxy using the specified user certificate
// and user key on the Grid entrypoint. The expiry date will be the
// default expiry date (one day).
//
// If the key is password protected, the password can be set when
// called.
//
// Input parameters:
// - key: path to the user key on the Grid entrypoint file system.
// - cert: path to the user certificate on the Grid entrypoint
//         file system.
// - pw: password for the user key. If the key is not password
//       protected, it must be a blank string.
// - cb: callback called when the command finishes. The callback
//       can have two arguments: err, containing a message string
//       if an error has occured or null if there has been no error,
//       and userinfo, an object containing the information of the
//       user issuing the proxy, with the fields:
//       - expery: string with the proxy expiry date.
//       - identity: an object containing the user identity, with the
//         fields:
//         - country: string with the contry short name.
//         - organization: string with the issuer organization.
//         - unit: string with the issuer organizational unit.
//         - name: string with the issuer full name.
//
// Output parameters:
// - None.
//
Globus.prototype.proxyInit = function(key, cert, pw, cb)
{
	var fd = new SSH();
	var userinfo = 
	{
		expiry: '',
		identity: 
		{
			country: '',
			organization: '',
			unit: '',
			name: ''
		}
	};
	
	fd.connect(
	{
		host: this.hostname,
		port: this.port,
		username: this.username,
		password: this.password
	});
	
	var command = 'grid-proxy-init ';
	command += '-key ' + key + ' ';
	command += '-cert ' + cert;
	command += ' -pwstdin';
	
	fd.on('ready', function()
	{	
		fd.exec(command, function(err,stream)
		{
			if (err)
			{
				fd.end();
				
				if (cb)
				{
					cb(err);
				}
			}
			else
			{
				if (pw != '')
				{
					stream.write(pw + '\n');
				}
				
				stream.on('close', function(code,signal)
				{
					fd.end();
					this.proxyActive = true;
					
					if (cb)
					{
						cb(null,userinfo);
					}
				});
				
				stream.on('data', function(data)
				{
					var buf = data.toString().split('\n');
					
					if (buf[0].indexOf('identity') > 0)
					{
						var identity = buf[0].split(': ')[1];
						identity = identity.split('/');
						
						userinfo.identity.country = identity[1].split('=')[1];
						userinfo.identity.organization = identity[2].split('=')[1];
						userinfo.identity.unit = identity[3].split('=')[1];
						userinfo.identity.name = identity[4].split('=')[1];
					}
					
					if (buf[1])
					{
						if (buf[1].indexOf('valid') > 0)
						{
							userinfo.expiry = buf[1].split(': ')[1];
						}
					}
				});
			}
		});
	});
};


//
// proxyDestroy() method.
// (Async)
//
// This method destroys all active proxies on the Grid entrypoint.
//
// Input parameters:
// - cb: callback called when the command finishes. The callback
//       has a single argument: err, containing a message string
//       if an error has occured.
//
// Output parameters:
// - None.
//
Globus.prototype.proxyDestroy = function(cb)
{
	var fd = new SSH();
	
	fd.connect(
	{
		host: this.hostname,
		port: this.port,
		username: this.username,
		password: this.password
	});
	
	fd.on('ready', function()
	{	
		fd.exec('grid-proxy-destroy', function(err,stream)
		{
			if (err)
			{
				fd.end();
				
				if (cb)
				{
					cb(err);
				}
			}
			else
			{
				stream.on('close', function(code,signal)
				{
					fd.end();
					this.proxyActive = false;
					
					if (cb)
					{
						cb(null);
					}
				});
			}
		});
	});
};


//
// stageIn() method.
// (Async)
//
// This method stages the specified file from the local host to
// the grid entrypoint.
//
// Input parameters:
// - local: source path to the file on the local host file system.
// - remote: destination path to the file on the Grid entrypoint
//           file system.
// - cb: callback called when the command finishes. The callback
//       has one argument: err, containing a message string if
//       an error has occured or null if there has been no error.
//
// Output parameters:
// - None.
//
Globus.prototype.stageIn = function(local, remote, cb)
{
	var fd = new SSH();
	
	fd.connect(
	{
		host: this.hostname,
		port: this.port,
		username: this.username,
		password: this.password
	});
	
	fd.on('ready', function()
	{	
		fd.sftp(function(err,sftp)
		{
			if (err)
			{
				cb(err);
			}
			else
			{
				sftp.fastPut(local, remote, function(err)
				{
					fd.end();
					
					if (err)
					{
						if (cb)
						{
							cb(err);
						}
					}
					else
					{
						if (cb)
						{
							cb(null);
						}
					}
				});
			}
		});
	});
};


//
// stageOut() method.
// (Async)
//
// This method stages the specified file from the Grid entrypoint to
// the local host.
//
// Input parameters:
// - local: source path to the file on the Grid entrypoint file system.
// - remote: destination path to the file on the local host file system.
// - cb: callback called when the command finishes. The callback
//       has one argument: err, containing a message string if
//       an error has occured or null if there has been no error.
//
// Output parameters:
// - None.
//
Globus.prototype.stageOut = function(local, remote, cb)
{
	var fd = new SSH();
	
	fd.connect(
	{
		host: this.hostname,
		port: this.port,
		username: this.username,
		password: this.password
	});
	
	fd.on('ready', function()
	{	
		fd.sftp(function(err,sftp)
		{
			if (err)
			{
				if (cb)
				{
					cb(err);
				}
			}
			else
			{
				sftp.fastGet(local, remote, function(err)
				{
					fd.end();
					
					if (err)
					{
						if (cb)
						{
							cb(err);
						}
					}
					else
					{
						if (cb)
						{
							cb(null,true);
						}
					}
				});
			}
		});
	});
};


//
// gassStart() method.
// (Async)
//
// This method starts a GASS server on the Grid entrypoint on the specified
// port.
//
// Input parameters:
// - local: port to use when starting the GASS server.
// - cb: callback called when the command finishes. The callback
//       has one argument: err, containing a message string if
//       an error has occured or null if there has been no error.
//
// Output parameters:
// - None.
//
Globus.prototype.gassStart = function(port, cb)
{
	var fd = new SSH();
	
	fd.connect(
	{
		host: this.hostname,
		port: this.port,
		username: this.username,
		password: this.password
	});
	
	fd.on('ready', function()
	{	
		fd.exec('nohup globus-gass-server -r -w -p ' + port, function(err,stream)
		{
			if (err)
			{
				fd.end();
				
				if (cb)
				{
					cb(err);
				}
			}
			else
			{
				stream.on('close', function(code,signal)
				{
					fd.end();
					this.gassActive = true;
					
					if (cb)
					{
						cb(null);
					}
				});
			}
		});
	});
};


//
// gassStop() method.
// (Async)
//
// This method stops all the GASS servers running on the Grid
// entrypoint.
//
// Input parameters:
// - cb: callback called when the command finishes. The callback
//       has one argument: err, containing a message string if
//       an error has occured or null if there has been no error.
//
// Output parameters:
// - None.
//
Globus.prototype.gassStop = function(cb)
{
	var fd = new SSH();
	
	fd.connect(
	{
		host: this.hostname,
		port: this.port,
		username: this.username,
		password: this.password
	});
	
	fd.on('ready', function()
	{	
		fd.exec('kill -9 $(pidof globus-gass-server)', function(err,stream)
		{
			if (err)
			{
				fd.end();
				
				if (cb)
				{
					cb(err);
				}
			}
			else
			{
				stream.on('close', function(code,signal)
				{
					fd.end();
					this.gassActive = false;
					
					if (cb)
					{
						cb(null);
					}
				});
			}
		});
	});
};


//
// run() method.
// (Async)
//
// This method starts a job on the Grid using the specified RSL
// specification file and the specified target node name.
//
// An URI to check the status of the job is obtained by using
// this method.
//
// Input parameters:
// - rsl: local path on the Grid entrypoint file system to the
//        job RSL specification file.
// - host: host name of the target Grid node to run the job at.
// - cb: callback called when the command finishes. The callback
//       has two arguments: err, containing a message string if
//       an error has occured or null if there has been no error
//       and uri, containing an URI to check the status of the
//       submitted job.
//
// Output parameters:
// - None.
//
Globus.prototype.run = function(rsl, host, cb)
{
	var fd = new SSH();
	var uri = '';
	
	fd.connect(
	{
		host: this.hostname,
		port: this.port,
		username: this.username,
		password: this.password
	});
	
	fd.on('ready', function()
	{	
		fd.exec('globusrun -q -b -r ' + host + ' -f ' + rsl, function(err,stream)
		{
			if (err)
			{
				fd.end();
				
				if (cb)
				{
					cb(err);
				}
			}
			else
			{
				stream.on('close', function(code,signal)
				{
					fd.end();
					
					if (cb)
					{
						cb(null,uri);
					}
				});
				
				stream.on('data', function(data)
				{
					if (uri == '')
					{
						uri = data.toString().split('\n')[0];
					}
				});
			}
		});
	});
};


//
// status() method.
// (Async)
//
// This method retrieves the status of the specified on the URI.
// The different possible status values are the ones returned by
// the Globus job status command, which are:
// - PENDING
// - ACTIVE
// - FAILED
// - SUSPENDED
// - DONE
// - UNSUBMITTED
// - STAGE_IN
// - STAGE_OUT
//
// Input parameters:
// - uri: URI referencing the job to be checked.
// - cb: callback called when the command finishes. The callback
//       has two arguments: err, containing a message string if
//       an error has occured or null if there has been no error
//       and status, a string containing the job current status
//       using any of the values specified earlier.
//
// Output parameters:
// - None.
//
Globus.prototype.status = function(uri, cb)
{
	var fd = new SSH();
	var status = '';
	
	fd.connect(
	{
		host: this.hostname,
		port: this.port,
		username: this.username,
		password: this.password
	});
	
	fd.on('ready', function()
	{	
		fd.exec('globus-job-status ' +  uri, function(err,stream)
		{
			if (err)
			{
				fd.end();
				
				if (cb)
				{
					cb(err);
				}
			}
			else
			{
				stream.on('close', function(code,signal)
				{
					fd.end();
					
					if (cb)
					{
						cb(null,status);
					}
				});
				
				stream.on('data', function(data)
				{
					if (status == '')
					{
						status = data.toString().split('\n')[0];
					}
				});
			}
		});
	});
};


//
// rsl() method.
// (Sync)
//
// Helper method to create a RSL job specification from the
// given job data.
//
// Input parameters:
// - params: object containing the job parameters, which are:
//   - count: number of times the job must be run.
//   - executable: path to the job executable.
//   - args: command line arguments to be passed to the executable.
//   - hostname: host name of the Grid entry point to stage files
//               from and to.
//   - port: port where the GASS server has been started on the
//           Grid entrypoint.
//   - inFile: file to stage into the node running the job.
//   - outFile: file to stage back from the node running the job.
//
// Output parameters:
// - A string containing the RSL specification of the job.
//
Globus.prototype.rsl = function(params)
{
	if (this.rslBase == '')
	{
		this.rslBase = fs.readFileSync('./etc/base.rsl');
	}
	
	var result = this.rslBase.toString();
	
	result = result.replace('$COUNT', params.count);
	result = result.replace('$EXEC', params.executable);
	result = result.replace('$ARGS', params.arguments);
	result = result.replace('$HOST', params.hostname);
	result = result.replace('$PORT', params.port);
	result = result.replace('$INFILE', params.inFile);
	result = result.replace('$INFILE', params.inFile);
	result = result.replace('$OUTFILE', params.outFile);
	result = result.replace('$OUTFILE', params.outFile);
	
	return result;
};


module.exports = Globus;