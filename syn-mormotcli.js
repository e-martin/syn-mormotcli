import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import {synCommonsMixin} from './syn-commons.js';

/**
 * `syn-mormotcli`
 * is a client web component for mORMot HTTP Server (http://synopse.info).
 * This component allows to connect to a REST/JSON server of mORMot and allows to perform specific operations on it.
 * How to be:
 *
 *   * Make a login with default authentification.
 *   * Do CRUD operations on ORM tables.
 *   * Invoke services based on interfaces or methods.
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 * @appliesMixin synCommonsMixin
 * @mixes SynCommonsMixin
 */
export class SynMormotcli extends synCommonsMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
        }
      </style>
      <h2>host: [[host]]</h2>
    `;
  }

  static get properties() {
    return {
      /**
       * Server host.
       * @type {string}
       */
      host: {
        type: String,
        value: 'localhost'
      },
      /**
       * Server port.
       * @type {string}
       */
      port: {
          type: String,
          value: '8888'
      },
      /**
       * Connect to the server with https://.
       * @type {boolean}
       */
      ssl: {
        type: Boolean,
        value: false
      },
      /**
       * Use user authentification (require login with user name and password).
       * @type {boolean}
       */
      userAuth: {
        type: Boolean,
        value: true
      },
      /**
       * Service root.
       * @type {string}
       */
      rootModel: {
        type: String,
        value: 'root'
      },
      /**
       * Compose the URL based on sll, host and port properties.
       * @type {string}
       */
      baseURL: {
        type: String,
        computed: 'computeBaseURL(ssl, host, port)'
      },
      /**
       * Websocket server host. If set "=" value, take the value from **host** property.
       * @type {string}
       */
      wsHost: {
        type: String,
        value: ''
      },
      /**
       * Websocket server port. Cannot be the same value as **port** property.
       * @type {string}
       */
      wsPort: {
        type: String,
        value: ''
      },
      /**
       * Websocket root. If set "=" value, take the value from **host** property.
       * @type {string}
       */
      wsRoot: {
        type: String,
        value: ''
      },
      /**
       * Websocket transmission key.
       * @type {string}
       */
      wsTransmissionKey: {
        type: String,
        value: ''
      },

      /**
       * Name of the event to be fired defined in **on-login-failed**.
       *
       * @type {string}
       */
      onLoginFailed: {
        type: String,
        value: ''
      },
      /**
       * Name of the event to be fired defined in **on-login-ok**.
       *
       * @type {string}
       */
      onLoginOk: {
        type: String,
        value: ''
      },
      /**
       * Name of the event to be fired defined in **on-logout-failed**.
       *
       * @type {string}
       */
      onLogoutFailed: {
        type: String,
        value: ''
      },
      /**
       * Name of the event to be fired defined in **on-logout-ok**.
       *
       * @type {string}
       */
      onLogoutOk: {
        type: String,
        value: ''
      },
      /**
       * Name of the event to be fired defined in **on-ws-open**.
       *
       * @type {string}
       */
      onWsOpen: {
        type: String,
        value: ''
      },
      /**
       * Name of the event to be fired defined in **on-ws-message**.
       *
       * @type {string}
       */
      onWsMessage: {
        type: String,
        value: ''
      },
      /**
       * Name of the event to be fired defined in **on-ws-error**.
       *
       * @type {string}
       */
      onWsError: {
        type: String,
        value: ''
      },
      /**
       * Name of the event to be fired defined in **on-ws-close**.
       *
       * @type {string}
       */
      onWsClose: {
        type: String,
        value: ''
      }
    };
  }

  /**
   * Makes an HTTP request
   * @param {string} sURL The complete URL.
   * @param {string} sVerb Method action
   * @param {Object} oHeaders HTTP headers, ie: {Header-Name: "header value"}
   * @param {Object} oBody Body content in JSON format, ie: {fieldName: "fieldValue"}.
   * @return {Promise<Response>}
   */
  httpRequest(sURL, sVerb, oHeaders, oBody) {

    let options,
        sBody = '';

    if ((oHeaders === null) || (typeof oHeaders !== 'object')) {
      oHeaders = {'Content-Type': 'application/json; charset=UTF-8'};
    }

    if ([SynMormotcli.GET_HTTP_VERB,SynMormotcli.HEAD_HTTP_VERB].indexOf(sVerb)===-1) {
      if ((typeof oBody !== null) && (typeof oBody === 'object')) {
        sBody = JSON.stringify(oBody);
      }
      options = {method: sVerb, headers: oHeaders, body: sBody};
    } else {
      options = {method: sVerb, headers: oHeaders};
    }

    return fetch(sURL, options).then((response) => this._handleResponse(response))
           .then((data) => {return data})
           .catch((error) => {return Promise.reject(error)});
  }

  /**
   * Invoke mORMot service.
   * @param {string} sEndPoint Method name (ie: Timestamp) or service ie: Service.Method
   * @param {Object} oParams JSON object, ie: {ParamName: "ParamValue", ...}
   * @param {Object} oHeaders HTTP headers, ie: {Header-Name: "header value"}
   * @return {Promise<Data | Error>}
   */
  invokeService(sEndPoint, oParams, oHeaders) {
    return this.mORMotRequest(sEndPoint,SynMormotcli.POST_HTTP_VERB,oHeaders,oParams,true).
      then((data) => {
        if ((typeof data === 'object') && (typeof data.result !== 'undefined')) {
          return data.result;
        } else {
          return data;
        }
      }).
    catch((error) => {
      return Promise.reject(error);
    })
  }

  /**
   * Is true when the login is successful.
   * @return {boolean}
   */
  isLogged() {
    return this._sessionID>0;
  }

  /**
   * Login to mORMot server
   * @param {string} aUserName
   * @param {string} aPassword
   * @param  {boolean} aIsHashed Is the password hashed ?
   */
  login(aUserName, aPassword, aIsHashed) {

    this._userName = aUserName;
    this._password = aPassword;
    if (!aIsHashed) {
      this._password = this.sha256hash(this._salt+this._password);
    }
    this._sessionTickCountOffset = new Date().getTime();
    return this.mORMotRequest('timestamp',SynMormotcli.POST_HTTP_VERB,null).
      then((data) => {
        let timestamp = parseInt(data, 10);
        this._serverTimeStampOffset = timestamp - SynMormotcli.mORMotNowTime();
        return this.mORMotRequest('Auth',SynMormotcli.GET_HTTP_VERB,null,{UserName: this._userName}).
          then((data) => {
            //create client nonce
            let clientNonce, s, d = new Date();
            clientNonce = d.getFullYear().toString();
            s = d.getMonth().toString();
            if (s.length === 1) {
                s = '0' + s;
            }
            clientNonce = clientNonce + '-' + s;
            s = d.getDate().toString();
            if (s.length === 1) {
                s = '0' + s;
            }
            clientNonce = clientNonce + '-' + s + ' ';
            s = d.getHours().toString();
            if (s.length === 1) {
                s = '0' + s;
            }
            clientNonce = clientNonce + s;
            s = d.getMinutes().toString();
            if (s.length === 1) {
                s = '0' + s;
            }
            clientNonce = clientNonce + ':' + s;
            s = d.getSeconds().toString();
            if (s.length === 1) {
                s = '0' + s;
            }
            clientNonce = this.sha256hash(clientNonce + ':' + s);
            let oData = {
              UserName: this._userName,
              Password: this.sha256hash(this.rootModel + data.result + clientNonce + this._userName + this._password),
              ClientNonce: clientNonce
            };
            return this.mORMotRequest('Auth',SynMormotcli.GET_HTTP_VERB,null,oData).
              then((data) => {
                let i = data.result.indexOf("+");
                this._sessionID = parseInt(data.result.slice(0, i), 10);
                this._sessionIDHexa8 = this._sessionID.toString(16);
                while (this._sessionIDHexa8.length < 8) {
                    this._sessionIDHexa8 = '0' + this._sessionIDHexa8;
                }
                this._sessionPrivateKey = this.crc32(this._password, this.crc32(data.result, 0));
                this._sessionData = data;
                this._handleOnLoginOk(this._sessionData);
              }).
              catch((error) => {
                this._handleOnLoginFailed(error);
              })
          }).
          catch((error) => {
            this._handleOnLoginFailed(error);
          });
      }).
      catch((error) => {
        this._handleOnLoginFailed(error);
      });
  }

  /**
   * Logout from the mORMot server
   * @return {Promise<null>}
   */
  logout() {
    if (this.isLogged()) {
      return this.mORMotRequest('Auth',SynMormotcli.GET_HTTP_VERB,null,{UserName:this._userName,Session:this._sessionID},true).
        then((data) => {
          this._sessionID = 0; // isLogged() = false
          this._handleOnLogoutOk(data);
        }).
        catch((error) => {
          this._sessionID = 0; // isLogged() = false
          this._handleOnLogoutFailed(error);
        }).
        finally(() => {
          this._sessionData = null;
          this._sessionIDHexa8 = '';
          this._sessionPrivateKey = '';
        });
    }
  }

  /**
   * mORMot HTTP request: interface service, method service, ORM
   * @param {string} sURL Interface service, method service, ORM CRUD.
   * @param {string} sVerb GET,POST,PUT,DELETE.
   * @param {Object} oHeaders Headers declaration in a JSON object.
   * @param {Object} oParamsOrBody Parameters declaration (GET method) or body in a JSON object.
   * @param {boolean} bSign Indicates if the URL is signed.
   * @return {Promise<Response>} Return a promise.
   */
  mORMotRequest(sURL, sVerb, oHeaders, oParamsOrBody, bSign) {
    let sParameters = '',
        sNewURL;

    if ([SynMormotcli.GET_HTTP_VERB,SynMormotcli.HEAD_HTTP_VERB].indexOf(sVerb) !== -1) {
      sParameters = SynMormotcli.JsonToUrl(oParamsOrBody);
      if (sParameters !== '') {
        sParameters = '?'+sParameters;
      }
      oParamsOrBody = null;
    }
    if (bSign) {
      sNewURL = this.signURL(this.rootModel+'/'+sURL+sParameters);
    } else {
      sNewURL = this.rootModel+'/'+sURL+(sParameters !== '' ? sParameters : '');
    }

    return this.httpRequest(this.baseURL+sNewURL,sVerb,oHeaders,oParamsOrBody);
  }

  /**
   * New salt for hashing password
   * @param {string} aSalt
   * @return {string} return the new salt
   */
  setSalt(aSalt) {
    this._salt = aSalt;
    return this._salt;
  }

  /**
   * Sign the URL.
   * @param {string} url URL to sign.
   * @return {string} The URL signed with the parameter added session_signature=...
   */
  signURL(url) {
    let Tix, Nonce, s, ss, d = new Date();
    if (this.isLogged()) {
      Tix = d.getTime() - this._sessionTickCountOffset;
      Nonce = Tix.toString(16);
      while (Nonce.length < 8) {
        Nonce = '0' + Nonce;
      }
      if (Nonce.length > 8) {
        Nonce = Nonce.slice(Nonce.length - 8);
      }
      ss = this.crc32(url, this.crc32(Nonce, this._sessionPrivateKey)).toString(16);
      while (ss.length < 8) {
        ss = '0' + ss;
      }
      if (url[url.length-1] === '/') {
        url = url.substring(0,url.length-1);
      }
      s = url.indexOf("?") === -1 ? url + '?session_signature=' : url + '&session_signature=';
      return s + this._sessionIDHexa8 + Nonce + ss;
    }
    else {
      return url;
    }
  }

  /**
   * Delete a record on a table.
   * @param {string} sTable Table from which a record will be deleted.
   * @param {number} iID Record ID to be deleted.
   * @return {Promise<Response>}
   */
  sqlRecordDelete(sTable,iID) {
    let sEndPoint = sTable;

    sEndPoint = sEndPoint+'/'+iID.toString();

    return this.mORMotRequest(sEndPoint,SynMormotcli.DELETE_HTTP_VERB,null,null,true).
    then((data) => {
      return data;
    }).
    catch((error) => {
      return Promise.reject(error);
    })
  }

  /**
   * Delete a record on a table with a where clause.
   * @param {string} sTable Table from which a record will be deleted.
   * @param {string} sWhere Where condition.
   * @return {Promise<Response>}
   */
  sqlRecordDeleteWhere(sTable,sWhere) {
    let sEndPoint = sTable;

    sEndPoint = sEndPoint+'?where='+encodeURIComponent(sWhere);

    return this.mORMotRequest(sEndPoint,SynMormotcli.DELETE_HTTP_VERB,null,null,true).
    then((data) => {
      return data;
    }).
    catch((error) => {
      return Promise.reject(error);
    })
  }

  /**
   * Insert a record on a table.
   * @param {string} sTable Table from which a record will be inserted.
   * @param {object} oData Data to be inserted.
   * @return {Promise<number>}
   */
  sqlRecordInsert(sTable,oData) {
    let sEndPoint = sTable;

    sEndPoint = sEndPoint;

    return this.mORMotRequest(sEndPoint,SynMormotcli.POST_HTTP_VERB,null,oData,true).
    then((data) => {
      // extract from Location: TableName/NewID the NewID value
      data = this._lastResponse.headers.get('location').split('/')[1];
      return parseInt(data,0);
    }).
    catch((error) => {
      return Promise.reject(error);
    })
  }

  /**
   * Retrieve records from a table.
   * @param {string} sTable Table from which records will be retrieved.
   * @param {string} sFields Fields to retrieve.
   * @param {string} sWhere Where condition.
   * @return {Promise<Response>}
   */
  sqlRecordSelect(sTable,sFields,sWhere) {
    let sEndPoint = sTable;
    if (sFields !== '') {
      sEndPoint = sEndPoint+'?select='+sFields;
    }
    if (sWhere !== '') {
      sEndPoint = sEndPoint + '&where='+encodeURIComponent(sWhere);
    }
    return this.mORMotRequest(sEndPoint,SynMormotcli.GET_HTTP_VERB,null,null,true).
    then((data) => {
      if ((typeof data === 'object') && (typeof data.result === 'object')) {
        return data.result[0];
      } else {
        return data;
      }
    }).
    catch((error) => {
      return Promise.reject(error);
    })
  }

  /**
   * Update a record on a table.
   * @param {string} sTable Table from which a record will be updated.
   * @param {number} iID Record ID to be updated.
   * @param {object} oData Data to be updated.
   * @return {Promise<Response>}
   */
  sqlRecordUpdate(sTable,iID,oData) {
    let sEndPoint = sTable;

    sEndPoint = sEndPoint+'/'+iID.toString();

    return this.mORMotRequest(sEndPoint,SynMormotcli.PUT_HTTP_VERB,null,oData,true).
    then((data) => {
      return data;
    }).
    catch((error) => {
      return Promise.reject(error);
    })
  }

  /**
   * Update a record on a table with a where clause.
   * @param {string} sTable Table from which a record will be deleted.
   * @param {string} sWhere Where condition.
   * @param {object} oData Data to be updated.
   * @return {Promise<Response>}
   */
  sqlRecordUpdateWhere(sTable,oWhere,oData) {
    let sEndPoint = sTable;

    sEndPoint = sEndPoint+'?'+SynMormotcli.JsonToUpdateSet(oData)+'&'+SynMormotcli.JsonToUpdateWhere(oWhere);

    return this.mORMotRequest(sEndPoint,SynMormotcli.PUT_HTTP_VERB,null,null,true).
    then((data) => {
      return data;
    }).
    catch((error) => {
      return Promise.reject(error);
    })
  }

  // internal methods

  /**
   * Fire an event with the name defined here.
   * @param {object} e Event with "detail" property which has specific information about it.
   * @private
   * @event on-login-failed
   */
  _handleOnLoginFailed(e) {
    if (this.onLoginFailed !== '') {
      this.dispatchEvent(new CustomEvent(this.onLoginFailed, {detail: e}));
    }
  }

  /**
   * Fire an event with the name defined here.
   * @param {object} e Event with "detail" property which has specific information about it.
   * @private
   * @event on-login-ok
   */
  _handleOnLoginOk(e) {
    if (this.onLoginOk !== '') {
      this.dispatchEvent(new CustomEvent(this.onLoginOk, {detail: e}));
    }
  }

  /**
   * Fire an event with the name defined here.
   * @param {object} e Event with "detail" property which has specific information about it.
   * @private
   * @event on-login-failed
   */
  _handleOnLogoutFailed(e) {
    if (this.onLogoutFailed !== '') {
      this.dispatchEvent(new CustomEvent(this.onLogoutFailed, {detail: e}));
    }
  }

  /**
   * Fire an event with the name defined here.
   * @param {object} e Event with "detail" property which has specific information about it.
   * @private
   * @event on-logout-ok
   */
  _handleOnLogoutOk(e) {
    if (this.onLogoutOk !== '') {
      this.dispatchEvent(new CustomEvent(this.onLogoutOk, {detail: e}));
    }
  }

  /**
   * Fire an event with the name defined here.
   * @param {object} e Event with "detail" property which has specific information about it.
   * @private
   * @event on-ws-close
   */
  _handleOnWSClose(e) {
    if (this.onWsClose !== '') {
      this.dispatchEvent(new CustomEvent(this.onWsClose, {detail: e}));
    }
  }

  /**
   * Fire an event with the name defined here.
   * @param {object} e Event with "detail" property which has specific information about it.
   * @private
   * @event on-ws-error
   */
  _handleOnWSError(e) {
    if (this.onWsError !== '') {
      this.dispatchEvent(new CustomEvent(this.onWsError, {detail: e}));
    }
  }

  /**
   * Fire an event with the name defined here.
   * @param {object} e Event with "detail" property which has specific information about it.
   * @private
   * @event on-ws-message
   */
  _handleOnWSMessage(e) {
    if (this.onWsMessage !== '') {
      this.dispatchEvent(new CustomEvent(this.onWsMessage, {detail: e}));
    }
  }

  /**
   * Fire an event with the name defined here.
   * @param {object} e Event with "detail" property which has specific information about it.
   * @private
   * @event on-ws-open
   */
  _handleOnWSOpen(e) {
    if (this.onWsOpen !== '') {
      this.dispatchEvent(new CustomEvent(this.onWsOpen, {detail: e}));
    }
  }

  /**
   * Handle promise response.
   * Analyze the content-type header to determine the type response.
   * @param {object} response Promise response to be parsed.
   * @return {object} Return the response or error.
   * @private
   */
  _handleResponse(response) {
      let contentType = response.headers.get('content-type');
      this._lastResponse = response;

      if ((contentType === null) || contentType.includes('text/html') || contentType.includes('text/plain')) {
        return this._handleTextResponse(response)
      } else if (contentType.includes('application/json')) {
          return this._handleJSONResponse(response)
      } else {
          // Other response types as necessary. I haven't found a need for them yet though.
          throw new Error(`Sorry, content-type ${contentType} not supported`)
      }
  }

  /**
   * Handle JSON response
   * @param response Response to be handled.
   * @return {Promise<T>} Return the promise with JSON data, or promise error.
   * @private
   */
  _handleJSONResponse (response) {
      return response.json()
          .then(json => {
              if (response.ok) {
                  return json;
              } else {
                  return Promise.reject(Object.assign({}, json, {
                      status: response.status,
                      statusText: response.statusText
                  }))
              }
          })
  }

  /**
   * Handle TEXT response
   * @param response Response to be handled.
   * @return {Promise<T>} Return the promise with TEXT data, or promise error.
   * @private
   */
  _handleTextResponse (response) {
      return response.text()
          .then(text => {
              if (response.ok) {
                  return text;
              } else {
                  return Promise.reject({
                      status: response.status,
                      statusText: response.statusText,
                      err: text
                  })
              }
          })
  }

  /**
   * Computed property
   * @param {boolean} ssl use SSL ?
   * @param {string} host server IP or host name
   * @param {string} port server port
   * @param {string} rootModel root for the model
   * @return {string} return the base URL: http://host:port/rootModel/ or https://host:port/rootModel
   */
  computeBaseURL(ssl,host,port) {
    let baseURL = 'http://'+host+':'+port+'/';
      if (ssl) {
          baseURL = baseURL.slice(0, 4)+'s'+baseURL.slice(4);
      }
      return baseURL;
  }

  // getter and setter methods

  /**
   * GET verb constant
   * @return {string} 'GET'
   */
  static get GET_HTTP_VERB() {
    return 'GET';
  }

  /**
   * POST verb constant
   * @return {string} 'POST'
   */
  static get POST_HTTP_VERB() {
      return 'POST';
  }

  /**
   * PUT verb constant
   * @return {string} 'PUT'
   */
  static get PUT_HTTP_VERB() {
      return 'PUT';
  }

  /**
   * DELETE verb constant
   * @return {string} 'DELETE'
   */
  static get DELETE_HTTP_VERB() {
      return 'DELETE';
  }

  /**
   * HEAD verb constant
   * @return {string} 'HEAD'
   */
  static get HEAD_HTTP_VERB() {
      return 'HEAD';
  }

  // lifecycle methods
  constructor() {
    super();
    this._salt = 'salt'; // default salt
    this._serverTimeStampOffset = '';
    this._sessionID = 0;
    this._sessionIDHexa8 = '';
    this._sessionPrivateKey = '';
    this._sessionData = null;
    this._sessionTickCountOffset = 0;
    this._lastResponse = null;
  }

  connectedCallback(){
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  ready() {
    super.ready();

  }
}

window.customElements.define('syn-mormotcli', SynMormotcli);