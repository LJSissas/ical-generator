'use strict';

import moment from 'moment-timezone';
import ICalEvent from './event';
import {addOrGetCustomAttributes, formatDate, escape, generateCustomAttributes, applyInternalData} from './tools';


export enum ICalAlarmType {
    display = 'display',
    audio = 'audio'
}

export type ICalAlarmTypeValue = keyof ICalAlarmType;

interface ICalAttachment {
    uri: string;
    mime: string | null;
}

export interface ICalAlarmData {
    type?: ICalAlarmType | null;
    trigger?: number | moment.Moment | Date | null;
    triggerBefore?: number | moment.Moment | Date | null;
    triggerAfter?: number | moment.Moment | Date | null;
    repeat?: number | null;
    interval?: number | null;
    attach?: string | ICalAttachment | null;
    description?: string | null;
    x?: [string, string][];
}

interface ICalInternalAlarmData {
    type: ICalAlarmType | null;
    trigger: moment.Moment | number | null;
    repeat: number | null;
    interval: number | null;
    attach: ICalAttachment | null;
    description: string | null;
    x: [string, string][];
    [key: string]: unknown;
}



export default class ICalAlarm {
    private readonly data: ICalInternalAlarmData;
    private readonly event: ICalEvent;

    constructor (data: ICalAlarmData, event: ICalEvent) {
        this.data = {
            type: null,
            trigger: null,
            repeat: null,
            interval: null,
            attach: null,
            description: null,
            x: []
        };

        this.event = event;
        if (!event) {
            throw new Error('`event` option required!');
        }

        applyInternalData(this, data);
    }


    /**
     * Set/Get the alarm type
     * @since 0.2.1
     */
    type (type: ICalAlarmType | null): this;
    type (): ICalAlarmType | null;
    type (type?: ICalAlarmType | null): this | ICalAlarmType | null {
        if (type === undefined) {
            return this.data.type;
        }
        if (!type) {
            this.data.type = null;
            return this;
        }

        if (!Object.keys(ICalAlarmType).includes(type)) {
            throw new Error('`type` is not correct, must be either `display` or `audio`!');
        }

        this.data.type = type;
        return this;
    }


    /**
     * Set/Get seconds before event to trigger alarm
     *
     * ```js
     * // trigger alarm 10min before event starts
     * alarm.trigger(10 * 60);
     * ```
     *
     * @since 0.2.1
     */
    trigger (trigger: number | moment.Moment | moment.Duration | Date | null): this;
    trigger (): number | moment.Moment | null;
    trigger (trigger?: number | moment.Moment | moment.Duration | Date | null): this | number | moment.Moment | null {

        // Getter
        if (trigger === undefined && moment.isMoment(this.data.trigger)) {
            return this.data.trigger;
        }
        if (trigger === undefined && typeof this.data.trigger === 'number') {
            return -1 * this.data.trigger;
        }
        if (trigger === undefined) {
            return null;
        }

        // Setter
        if (!trigger) {
            this.data.trigger = null;
            return this;
        }
        if (trigger instanceof Date) {
            this.data.trigger = moment(trigger);
            return this;
        }
        if (moment.isMoment(trigger)) {
            this.data.trigger = trigger;
            return this;
        }
        if (moment.isDuration(trigger)) {
            this.data.trigger = -1 * trigger.as('seconds');
            return this;
        }
        if (typeof trigger === 'number' && isFinite(trigger)) {
            this.data.trigger = -1 * trigger;
            return this;
        }

        throw new Error('`trigger` is not correct, must be a `Number`, `Date` or `moment` or a `moment.duration`!');
    }


    /**
     * Set/Get seconds after event to trigger alarm
     * @since 0.2.1
     */
    triggerAfter (trigger: number | moment.Moment | moment.Duration | Date | null): this;
    triggerAfter (): number | moment.Moment | null;
    triggerAfter (trigger?: number | moment.Moment | moment.Duration | Date | null): this | number | moment.Moment | null {
        if (trigger === undefined) {
            return this.data.trigger;
        }
        if (moment.isDuration(trigger)) {
            this.data.trigger = -1 * trigger.as('seconds');
            return this;
        }

        return this.trigger(typeof trigger === 'number' ? -1 * trigger : trigger);
    }


    /**
     * Set/Get seconds before event to trigger alarm
     * @since 0.2.1
     */
    triggerBefore (trigger: number | moment.Moment | moment.Duration | Date | null): this;
    triggerBefore (): number | moment.Moment | null;
    triggerBefore (trigger?: number | moment.Moment | moment.Duration | Date | null): this | number | moment.Moment | null {
        if(trigger === undefined) {
            return this.trigger();
        }

        return this.trigger(trigger);
    }


    /**
     * Set/Get Alarm Repetitions
     * @since 0.2.1
     */
    repeat(): number | null;
    repeat(repeat: number | null): this;
    repeat (repeat?: number | null): this | number | null {
        if (repeat === undefined) {
            return this.data.repeat;
        }
        if (!repeat) {
            this.data.repeat = null;
            return this;
        }

        if (typeof repeat !== 'number' || !isFinite(repeat)) {
            throw new Error('`repeat` is not correct, must be numeric!');
        }

        this.data.repeat = repeat;
        return this;
    }


    /**
     * Set/Get Repeat Interval
     * @since 0.2.1
     */
    interval (interval: number | null): this;
    interval(): number | null;
    interval (interval?: number | null): this | number | null {
        if (interval === undefined) {
            return this.data.interval || null;
        }
        if (!interval) {
            this.data.interval = null;
            return this;
        }

        if (typeof interval !== 'number' || !isFinite(interval)) {
            throw new Error('`interval` is not correct, must be numeric!');
        }

        this.data.interval = interval;
        return this;
    }


    /**
     * Set/Get Attachment
     * @since 0.2.1
     */
    attach (attachment: {uri: string, mime?: string | null} | string | null): this;
    attach (): {uri: string, mime: string | null} | null;
    attach (attachment?: {uri: string, mime?: string | null} | string | null): this | {uri: string, mime: string | null} | null {
        if (attachment === undefined) {
            return this.data.attach;
        }
        if (!attachment) {
            this.data.attach = null;
            return this;
        }

        let _attach = null;
        if (typeof attachment === 'string') {
            _attach = {
                uri: attachment,
                mime: null
            };
        }
        else if (typeof attachment === 'object') {
            _attach = {
                uri: attachment.uri,
                mime: attachment.mime || null
            };
        }
        else {
            throw new Error(
                '`attach` needs to be a valid formed string or an object. See https://github.com/sebbo2002/ical-' +
                'generator#attachstringobject-attach'
            );
        }

        if (!_attach.uri) {
            throw new Error('`attach.uri` is empty!');
        }

        this.data.attach = {
            uri: _attach.uri,
            mime: _attach.mime
        };
        return this;
    }


    /**
     * Set/Get the alarm description
     * @since 0.2.1
     */
    description (description: string | null): this;
    description (): string | null;
    description (description?: string | null): this | string | null {
        if (description === undefined) {
            return this.data.description;
        }
        if (!description) {
            this.data.description = null;
            return this;
        }

        this.data.description = description;
        return this;
    }


    /**
     * Get/Set X-* attributes. Woun't filter double attributes,
     * which are also added by another method (e.g. busystatus),
     * so these attributes may be inserted twice.
     *
     * @since 1.9.0
     */
    x (keyOrArray: ({key: string, value: string})[] | Record<string, string>): this;
    x (keyOrArray: string, value: string): this;
    x (): {key: string, value: string}[];
    x (keyOrArray?: ({key: string, value: string})[] | Record<string, string> | string, value?: string): this | void | ({key: string, value: string})[] {
        if(keyOrArray === undefined) {
            return addOrGetCustomAttributes (this.data);
        }

        if(typeof keyOrArray === 'string' && typeof value === 'string') {
            addOrGetCustomAttributes (this.data, keyOrArray, value);
        }
        else if(typeof keyOrArray === 'object') {
            addOrGetCustomAttributes (this.data, keyOrArray);
        }
        else {
            throw new Error('Either key or value is not a string!');
        }

        return this;
    }


    /**
     * Export calender as JSON Object to use it later…
     * @since 0.2.4
     */
    toJSON (): ICalInternalAlarmData {
        return Object.assign({}, this.data, {
            trigger: this.trigger(),
            x: this.x()
        });
    }


    /**
     * Export Event to iCal
     * @since 0.2.0
     */
    toString (): string {
        let g = 'BEGIN:VALARM\r\n';

        if (!this.data.type) {
            throw new Error('No value for `type` in ICalAlarm given!');
        }
        if (!this.data.trigger) {
            throw new Error('No value for `trigger` in ICalAlarm given!');
        }

        // ACTION
        g += 'ACTION:' + this.data.type.toUpperCase() + '\r\n';

        if (moment.isMoment(this.data.trigger)) {
            g += 'TRIGGER;VALUE=DATE-TIME:' + formatDate(this.event.timezone(), this.data.trigger) + '\r\n';
        }
        else if (this.data.trigger > 0) {
            g += 'TRIGGER;RELATED=END:' + moment.duration(this.data.trigger, 's').toISOString() + '\r\n';
        }
        else {
            g += 'TRIGGER:' + moment.duration(this.data.trigger, 's').toISOString() + '\r\n';
        }

        // REPEAT
        if (this.data.repeat && !this.data.interval) {
            throw new Error('No value for `interval` in ICalAlarm given, but required for `repeat`!');
        }
        if (this.data.repeat) {
            g += 'REPEAT:' + this.data.repeat + '\r\n';
        }

        // INTERVAL
        if (this.data.interval && !this.data.repeat) {
            throw new Error('No value for `repeat` in ICalAlarm given, but required for `interval`!');
        }
        if (this.data.interval) {
            g += 'DURATION:' + moment.duration(this.data.interval, 's').toISOString() + '\r\n';
        }

        // ATTACH
        if (this.data.type === 'audio' && this.data.attach && this.data.attach.mime) {
            g += 'ATTACH;FMTTYPE=' + this.data.attach.mime + ':' + this.data.attach.uri + '\r\n';
        }
        else if (this.data.type === 'audio' && this.data.attach) {
            g += 'ATTACH;VALUE=URI:' + this.data.attach.uri + '\r\n';
        }
        else if (this.data.type === 'audio') {
            g += 'ATTACH;VALUE=URI:Basso\r\n';
        }

        // DESCRIPTION
        if (this.data.type === 'display' && this.data.description) {
            g += 'DESCRIPTION:' + escape(this.data.description) + '\r\n';
        }
        else if (this.data.type === 'display') {
            g += 'DESCRIPTION:' + escape(this.event.summary()) + '\r\n';
        }

        // CUSTOM X ATTRIBUTES
        g += generateCustomAttributes(this.data);

        g += 'END:VALARM\r\n';
        return g;
    }
}
