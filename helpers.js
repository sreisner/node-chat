function distanceMeters(latLng1, langLng2) {
    var R = 6371000;
    var φ1 = latLng1.latitude * Math.PI / 180;
    var φ2 = langLng2.latitude * Math.PI / 180;
    var Δφ = (langLng2.latitude-latLng1.latitude) * Math.PI / 180;
    var Δλ = (langLng2.longitude-latLng1.longitude) * Math.PI / 180;

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

module.exports.distanceMeters = distanceMeters;
